import { Test, TestingModule } from '@nestjs/testing';
import { TransactionService } from './transactions.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddPointDto } from './dto/add-point.dto';
import { UsePointDto } from './dto/use-point.dto';

describe('TransactionService', () => {
  let service: TransactionService;

  const mockPrismaService = {
    gachaPointTransaction: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addPoints', () => {
    it('ポイントを追加できること', async () => {
      const addPointDto: AddPointDto = {
        customerId: 'test-customer-id',
        amount: 100,
        description: 'テストポイント追加',
        orderId: 'test-order-id',
      };

      const mockCurrentBalance = 50;
      const mockTransaction = {
        id: 'test-transaction-id',
        ...addPointDto,
        balanceAtTransaction: mockCurrentBalance + addPointDto.amount,
        createdAt: new Date(),
      };

      jest.spyOn(service, 'getBalance').mockResolvedValue(mockCurrentBalance);
      mockPrismaService.gachaPointTransaction.create.mockResolvedValue(
        mockTransaction,
      );

      const result = await service.addPoints(addPointDto);

      expect(service.getBalance).toHaveBeenCalledWith(addPointDto.customerId);
      expect(
        mockPrismaService.gachaPointTransaction.create,
      ).toHaveBeenCalledWith({
        data: {
          ...addPointDto,
          balanceAtTransaction: mockCurrentBalance + addPointDto.amount,
        },
      });
      expect(result).toEqual(mockTransaction);
    });

    it('不正なポイント数（0以下）の場合はエラーを投げること', async () => {
      const addPointDto: AddPointDto = {
        customerId: 'test-customer-id',
        amount: -100,
        description: 'テストポイント追加',
        orderId: 'test-order-id',
      };

      await expect(service.addPoints(addPointDto)).rejects.toThrow(
        'ポイント数は0より大きい値である必要があります',
      );
    });
  });

  describe('usePoints', () => {
    it('ポイントを使用できること', async () => {
      const usePointDto: UsePointDto = {
        customerId: 'test-customer-id',
        amount: 50,
        description: 'テストポイント使用',
        orderId: 'test-order-id',
      };

      const mockCurrentBalance = 100;
      const mockTransaction = {
        id: 'test-transaction-id',
        ...usePointDto,
        amount: -usePointDto.amount,
        balanceAtTransaction: mockCurrentBalance - usePointDto.amount,
        createdAt: new Date(),
      };

      jest.spyOn(service, 'getBalance').mockResolvedValue(mockCurrentBalance);
      mockPrismaService.gachaPointTransaction.create.mockResolvedValue(
        mockTransaction,
      );

      const result = await service.usePoints(usePointDto);

      expect(service.getBalance).toHaveBeenCalledWith(usePointDto.customerId);
      expect(
        mockPrismaService.gachaPointTransaction.create,
      ).toHaveBeenCalledWith({
        data: {
          ...usePointDto,
          amount: -usePointDto.amount,
          balanceAtTransaction: mockCurrentBalance - usePointDto.amount,
        },
      });
      expect(result).toEqual(mockTransaction);
    });

    it('残高が不足している場合はエラーを投げること', async () => {
      const usePointDto: UsePointDto = {
        customerId: 'test-customer-id',
        amount: 150,
        description: 'テストポイント使用',
        orderId: 'test-order-id',
      };

      const mockCurrentBalance = 100;
      jest.spyOn(service, 'getBalance').mockResolvedValue(mockCurrentBalance);

      await expect(service.usePoints(usePointDto)).rejects.toThrow(
        '残高が不足しています',
      );
    });
  });

  describe('getBalance', () => {
    it('顧客のポイント残高を取得できること', async () => {
      const customerId = 'test-customer-id';
      const mockCustomer = {
        gachaPoints: 100,
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      const result = await service.getBalance(customerId);

      expect(mockPrismaService.customer.findUnique).toHaveBeenCalledWith({
        where: { id: customerId },
        select: { gachaPoints: true },
      });
      expect(result).toBe(mockCustomer.gachaPoints);
    });

    it('顧客が存在しない場合は0を返すこと', async () => {
      const customerId = 'non-existent-customer-id';

      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      const result = await service.getBalance(customerId);

      expect(mockPrismaService.customer.findUnique).toHaveBeenCalledWith({
        where: { id: customerId },
        select: { gachaPoints: true },
      });
      expect(result).toBe(0);
    });
  });

  describe('listTransactions', () => {
    it('取引履歴を取得できること', async () => {
      const customerId = 'test-customer-id';
      const mockTransactions = [
        {
          id: 'test-transaction-1',
          customerId,
          amount: 100,
          description: 'テスト取引1',
          orderId: 'test-order-1',
          balanceAtTransaction: 100,
          createdAt: new Date(),
        },
        {
          id: 'test-transaction-2',
          customerId,
          amount: -50,
          description: 'テスト取引2',
          orderId: 'test-order-2',
          balanceAtTransaction: 50,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.gachaPointTransaction.findMany.mockResolvedValue(
        mockTransactions,
      );

      const result = await service.listTransactions(customerId);

      expect(
        mockPrismaService.gachaPointTransaction.findMany,
      ).toHaveBeenCalledWith({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockTransactions);
    });
  });

  describe('連続取引', () => {
    it('複数の取引が正しく処理されること', async () => {
      const customerId = 'test-customer-id';
      const initialBalance = 0;

      // 最初の残高を設定
      jest
        .spyOn(service, 'getBalance')
        .mockResolvedValueOnce(initialBalance) // 最初の残高
        .mockResolvedValueOnce(200) // ポイント追加後の残高
        .mockResolvedValueOnce(200); // ポイント使用時の残高

      // ポイント追加
      const addPointDto: AddPointDto = {
        customerId,
        amount: 200,
        description: 'テストポイント追加',
        orderId: 'test-order-1',
      };

      const firstTransaction = {
        id: 'test-transaction-1',
        ...addPointDto,
        balanceAtTransaction: initialBalance + addPointDto.amount,
        createdAt: new Date(),
      };

      mockPrismaService.gachaPointTransaction.create.mockResolvedValueOnce(
        firstTransaction,
      );

      // ポイント使用
      const usePointDto: UsePointDto = {
        customerId,
        amount: 50,
        description: 'テストポイント使用',
        orderId: 'test-order-2',
      };

      const secondTransaction = {
        id: 'test-transaction-2',
        ...usePointDto,
        amount: -usePointDto.amount,
        balanceAtTransaction:
          firstTransaction.balanceAtTransaction - usePointDto.amount,
        createdAt: new Date(),
      };

      mockPrismaService.gachaPointTransaction.create.mockResolvedValueOnce(
        secondTransaction,
      );

      // 取引を実行
      await service.addPoints(addPointDto);
      const result = await service.usePoints(usePointDto);

      // 最終的な残高を確認
      expect(result.balanceAtTransaction).toBe(150);
    });
  });
});
