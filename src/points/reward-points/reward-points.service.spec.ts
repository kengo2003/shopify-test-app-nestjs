import { Test, TestingModule } from '@nestjs/testing';
import { RewardPointsService } from './reward-points.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('RewardPointsService', () => {
  let service: RewardPointsService;

  const mockPrismaService = {
    rewardPointTransaction: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardPointsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RewardPointsService>(RewardPointsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addPoints', () => {
    it('ポイントを追加できること', async () => {
      const dto = {
        customerId: 'test-customer',
        amount: 100,
        description: 'テストポイント追加',
        gachaResultId: 'test-gacha',
      };

      mockPrismaService.rewardPointTransaction.findMany.mockResolvedValue([
        { amount: 50 },
      ]);

      mockPrismaService.rewardPointTransaction.create.mockResolvedValue({
        ...dto,
        balanceAtTransaction: 150,
      });

      const result = await service.addPoints(dto);

      expect(
        mockPrismaService.rewardPointTransaction.create,
      ).toHaveBeenCalledWith({
        data: {
          ...dto,
          balanceAtTransaction: 150,
        },
      });
      expect(result.balanceAtTransaction).toBe(150);
    });
  });

  describe('usePoints', () => {
    it('ポイントを使用できること', async () => {
      const dto = {
        customerId: 'test-customer',
        amount: 50,
        description: 'テストポイント使用',
        gachaResultId: 'test-gacha',
      };

      mockPrismaService.rewardPointTransaction.findMany.mockResolvedValue([
        { amount: 100 },
      ]);

      mockPrismaService.rewardPointTransaction.create.mockResolvedValue({
        ...dto,
        amount: -50,
        balanceAtTransaction: 50,
      });

      const result = await service.usePoints(dto);

      expect(
        mockPrismaService.rewardPointTransaction.create,
      ).toHaveBeenCalledWith({
        data: {
          ...dto,
          amount: -50,
          balanceAtTransaction: 50,
        },
      });
      expect(result.balanceAtTransaction).toBe(50);
    });

    it('残高不足の場合はエラーを投げること', async () => {
      const dto = {
        customerId: 'test-customer',
        amount: 150,
        description: 'テストポイント使用',
        gachaResultId: 'test-gacha',
      };

      mockPrismaService.rewardPointTransaction.findMany.mockResolvedValue([
        { amount: 100 },
      ]);

      await expect(service.usePoints(dto)).rejects.toThrow(BadRequestException);
      expect(
        mockPrismaService.rewardPointTransaction.create,
      ).not.toHaveBeenCalled();
    });
  });

  describe('getBalance', () => {
    it('残高を正しく計算できること', async () => {
      const customerId = 'test-customer';
      const mockTransactions = [
        { amount: 100 },
        { amount: 50 },
        { amount: -30 },
      ];

      mockPrismaService.rewardPointTransaction.findMany.mockResolvedValue(
        mockTransactions,
      );

      const balance = await service.getBalance(customerId);

      expect(
        mockPrismaService.rewardPointTransaction.findMany,
      ).toHaveBeenCalledWith({
        where: { customerId },
      });
      expect(balance).toBe(120);
    });
  });

  describe('listTransactions', () => {
    it('トランザクション一覧を取得できること', async () => {
      const customerId = 'test-customer';
      const mockTransactions = [
        { id: 1, amount: 100 },
        { id: 2, amount: 50 },
      ];

      mockPrismaService.rewardPointTransaction.findMany.mockResolvedValue(
        mockTransactions,
      );

      const result = await service.listTransactions(customerId);

      expect(
        mockPrismaService.rewardPointTransaction.findMany,
      ).toHaveBeenCalledWith({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockTransactions);
    });
  });
});
