import { Test, TestingModule } from '@nestjs/testing';
import { GachaService } from './gacha.service';
import { RewardPointsService } from '../points/reward-points/reward-points.service';
import { PrismaService } from '../prisma/prisma.service';
import { GachaPointsService } from '../points/gacha-points/gacha-points.service';
import axios from 'axios';
import { GachaResultStatus } from '@prisma/client';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GachaService', () => {
  let service: GachaService;
  let rewardPointsService: RewardPointsService;
  let prismaService: PrismaService;
  let gachaPointService: GachaPointsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GachaService,
        {
          provide: RewardPointsService,
          useValue: {
            addPoints: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            customer: {
              findUnique: jest.fn(),
            },
            gachaResult: {
              create: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: GachaPointsService,
          useValue: {
            usePoints: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<GachaService>(GachaService);
    rewardPointsService = module.get<RewardPointsService>(RewardPointsService);
    prismaService = module.get<PrismaService>(PrismaService);
    gachaPointService = module.get<GachaPointsService>(GachaPointsService);
  });

  describe('drawGacha', () => {
    it('在庫が不足している場合、エラーを返すべき', async () => {
      const mockLineup = {
        cards: [],
        cost: 100,
      };

      jest
        .spyOn(service as any, 'getGachaLineupFromCollection')
        .mockResolvedValue(mockLineup);

      const result = await service.drawGacha('test-collection', 1, 1);

      expect(result.error).toBe('在庫が不足しています。');
      expect(result.results).toHaveLength(0);
    });

    it('ポイントが不足している場合、エラーを返すべき', async () => {
      const mockLineup = {
        cards: [
          {
            productId: '1',
            title: 'Test Card',
            variantId: '1',
            inventoryItemId: '1',
            locationId: '1',
            inventory: 10,
            image: 'test.jpg',
          },
        ],
        cost: 100,
      };

      jest
        .spyOn(service as any, 'getGachaLineupFromCollection')
        .mockResolvedValue(mockLineup);
      jest.spyOn(prismaService.customer, 'findUnique').mockResolvedValue({
        id: '1',
        gachaPoints: 50,
        rewardPoints: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
        deletedAt: null,
      });

      const result = await service.drawGacha('test-collection', 1, 1);

      expect(result.error).toBe('ポイント不足です。50pt不足です。');
      expect(result.results).toHaveLength(0);
    });

    it('正常にガチャを実行できる場合、結果を返すべき', async () => {
      const mockLineup = {
        cards: [
          {
            productId: '1',
            title: 'Test Card',
            variantId: '1',
            inventoryItemId: '1',
            locationId: '1',
            inventory: 10,
            image: 'test.jpg',
          },
        ],
        cost: 100,
      };

      jest
        .spyOn(service as any, 'getGachaLineupFromCollection')
        .mockResolvedValue(mockLineup);
      jest.spyOn(prismaService.customer, 'findUnique').mockResolvedValue({
        id: '1',
        gachaPoints: 200,
        rewardPoints: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
        deletedAt: null,
      });
      jest
        .spyOn(service as any, 'createDraftOrder')
        .mockResolvedValue({ id: '1' });
      jest
        .spyOn(service as any, 'adjustInventory')
        .mockResolvedValue(undefined);
      jest.spyOn(service as any, 'getRewardPointValue').mockResolvedValue(10);
      jest.spyOn(rewardPointsService, 'addPoints').mockResolvedValue({
        id: '1',
        createdAt: new Date(),
        customerId: '1',
        amount: 10,
        description: 'Test',
        balanceAtTransaction: 10,
        gachaResultId: '1',
      });
      jest.spyOn(prismaService.gachaResult, 'create').mockResolvedValue({
        id: '1',
        customerId: '1',
        gachaId: 'test-collection',
        cardId: '1',
        draftOrderId: '1',
        createdAt: new Date(),
        status: GachaResultStatus.PENDING,
        selectionDeadline: new Date(),
        rewardPointTransactionId: '1',
        selectedAt: null,
        redeemedAt: null,
        shippedAt: null,
        deliveredAt: null,
        shippingAddress: null,
        trackingNumber: null,
      });
      jest.spyOn(gachaPointService, 'usePoints').mockResolvedValue(undefined);

      const result = await service.drawGacha('test-collection', 1, 1);

      expect(result.error).toBeUndefined();
      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual({
        cardId: '1',
        title: 'Test Card',
        image: 'test.jpg',
      });
    });
  });

  describe('getGachaLineupFromCollection', () => {
    it('正常にコレクションからガチャラインナップを取得できるべき', async () => {
      const mockResponse = {
        data: {
          data: {
            collectionByHandle: {
              metafields: {
                edges: [
                  {
                    node: {
                      namespace: 'custom',
                      key: 'point_cost',
                      value: '100',
                    },
                  },
                ],
              },
              products: {
                edges: [
                  {
                    node: {
                      id: '1',
                      title: 'Test Card',
                      variants: {
                        edges: [
                          {
                            node: {
                              id: 'gid://shopify/ProductVariant/1',
                              inventoryQuantity: 10,
                              inventoryItem: {
                                id: '1',
                                inventoryLevels: {
                                  edges: [
                                    {
                                      node: {
                                        location: {
                                          id: '1',
                                        },
                                      },
                                    },
                                  ],
                                },
                              },
                            },
                          },
                        ],
                      },
                      featuredImage: {
                        url: 'test.jpg',
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result =
        await service['getGachaLineupFromCollection']('test-collection');

      expect(result.cost).toBe(100);
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0]).toEqual({
        productId: '1',
        title: 'Test Card',
        variantId: '1',
        inventoryItemId: '1',
        locationId: '1',
        inventory: 10,
        image: 'test.jpg',
      });
    });
  });
});
