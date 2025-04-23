import { Test, TestingModule } from '@nestjs/testing';
import { GachaPointsService } from './gacha-points.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('GachaPointsService', () => {
  let service: GachaPointsService;

  const mockPrismaService = {
    customer: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    gachaPointTransaction: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GachaPointsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<GachaPointsService>(GachaPointsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addPoints', () => {
    it('ポイントを追加できること', async () => {
      const mockData = {
        customerId: '1',
        amount: 100,
        description: 'テストポイント追加',
        orderId: 'order1',
      };

      const mockCustomer = {
        gachaPoints: 0,
      };

      const mockTransaction = {
        id: '1',
        ...mockData,
        balanceAtTransaction: 100,
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });
      mockPrismaService.gachaPointTransaction.create.mockResolvedValue(
        mockTransaction,
      );

      const result = await service.addPoints(mockData);

      expect(mockPrismaService.customer.update).toHaveBeenCalledWith({
        where: { id: mockData.customerId },
        data: { gachaPoints: { increment: mockData.amount } },
      });
      expect(result).toEqual(mockTransaction);
    });
  });

  describe('usePoints', () => {
    it('ポイントを使用できること', async () => {
      const mockData = {
        customerId: '1',
        amount: 50,
        description: 'テストポイント使用',
        orderId: 'order1',
      };

      const mockCustomer = {
        gachaPoints: 100,
      };

      const mockTransaction = {
        id: '1',
        ...mockData,
        amount: -mockData.amount,
        balanceAtTransaction: 50,
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });
      mockPrismaService.gachaPointTransaction.create.mockResolvedValue(
        mockTransaction,
      );

      const result = await service.usePoints(mockData);

      expect(mockPrismaService.customer.update).toHaveBeenCalledWith({
        where: { id: mockData.customerId },
        data: { gachaPoints: { decrement: mockData.amount } },
      });
      expect(result).toEqual(mockTransaction);
    });

    it('残高不足の場合はエラーを投げること', async () => {
      const mockData = {
        customerId: '1',
        amount: 150,
        description: 'テストポイント使用',
        orderId: 'order1',
      };

      const mockCustomer = {
        gachaPoints: 100,
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      await expect(service.usePoints(mockData)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getBalance', () => {
    it('残高を正しく取得できること', async () => {
      const customerId = '1';
      const mockCustomer = {
        gachaPoints: 100,
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      const result = await service.getBalance(customerId);

      expect(result).toBe(100);
      expect(mockPrismaService.customer.findUnique).toHaveBeenCalledWith({
        where: { id: customerId },
        select: { gachaPoints: true },
      });
    });
  });

  describe('listTransactions', () => {
    it('トランザクション履歴を正しく取得できること', async () => {
      const customerId = '1';
      const mockTransactions = [
        {
          id: '1',
          customerId,
          amount: 100,
          description: 'テストポイント追加',
          orderId: 'order1',
          balanceAtTransaction: 100,
        },
      ];

      mockPrismaService.gachaPointTransaction.findMany.mockResolvedValue(
        mockTransactions,
      );

      const result = await service.listTransactions(customerId);

      expect(result).toEqual(mockTransactions);
      expect(
        mockPrismaService.gachaPointTransaction.findMany,
      ).toHaveBeenCalledWith({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('handleShopifyWebhook', () => {
    it('Shopifyの注文からポイントを正しく追加できること', async () => {
      const mockWebhookData = {
        customer: { id: '1' },
        line_items: [
          { sku: 'point_100' },
          { sku: 'point_50' },
          { sku: 'other_product' },
        ],
        id: 'order1',
      };

      const mockCustomer = {
        gachaPoints: 0,
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });

      const result = await service.handleShopifyWebhook(mockWebhookData);

      expect(result).toEqual({
        success: true,
        message: '150ポイントを追加しました',
      });
    });

    it('顧客IDがない場合はエラーを返すこと', async () => {
      const mockWebhookData = {
        line_items: [{ sku: 'point_100' }],
      };

      const result = await service.handleShopifyWebhook(mockWebhookData);

      expect(result).toEqual({
        success: false,
        message: 'Customer ID not found',
      });
    });

    it('ポイント対象商品がない場合は成功を返すこと', async () => {
      const mockWebhookData = {
        customer: { id: '1' },
        line_items: [{ sku: 'other_product' }],
      };

      const result = await service.handleShopifyWebhook(mockWebhookData);

      expect(result).toEqual({
        success: true,
        message: 'No points to add',
      });
    });
  });
});
