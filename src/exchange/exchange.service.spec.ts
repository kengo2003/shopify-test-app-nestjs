import { Test, TestingModule } from '@nestjs/testing';
import { ExchangeService } from './exchange.service';
import { DraftOrdersService } from '../draft-orders/draft-orders.service';
import { RewardPointsService } from '../points/reward-points/reward-points.service';
import axios from 'axios';

jest.mock('axios');
jest.mock('dotenv');

describe('ExchangeService', () => {
  let service: ExchangeService;
  let rewardPointsService: RewardPointsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeService,
        {
          provide: DraftOrdersService,
          useValue: {
            // モックの実装
          },
        },
        {
          provide: RewardPointsService,
          useValue: {
            usePoints: jest.fn().mockResolvedValue({ success: true }),
          },
        },
      ],
    }).compile();

    service = module.get<ExchangeService>(ExchangeService);
    rewardPointsService = module.get<RewardPointsService>(RewardPointsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRewardPointValue', () => {
    it('should return reward point value from metafields', async () => {
      const mockResponse = {
        data: {
          metafields: [
            {
              namespace: 'custom',
              key: 'reward_point_value',
              value: '100',
            },
          ],
        },
      };

      (axios.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.getRewardPointValue('123');
      expect(result).toEqual({ reward_point_value: '100' });
    });

    it('should return 0 when reward point value is not found', async () => {
      const mockResponse = {
        data: {
          metafields: [],
        },
      };

      (axios.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.getRewardPointValue('123');
      expect(result).toEqual({ reward_point_value: 0 });
    });
  });

  describe('getCustomerPoints', () => {
    it('should return customer points', async () => {
      const result = await service.getCustomerPoints();
      expect(result).toEqual({ points: 120 });
    });
  });

  describe('getExchangeItems', () => {
    it('should return exchange items', async () => {
      const mockResponse = {
        data: {
          data: {
            collectionByHandle: {
              products: {
                edges: [
                  {
                    node: {
                      id: 'gid://shopify/Product/123',
                      title: 'Test Product',
                      featuredImage: {
                        url: 'https://example.com/image.jpg',
                      },
                      variants: {
                        edges: [
                          {
                            node: {
                              id: 'gid://shopify/ProductVariant/456',
                              inventoryQuantity: 10,
                            },
                          },
                        ],
                      },
                      metafield: {
                        value: '100',
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      };

      (axios.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.getExchangeItems();
      expect(result).toEqual([
        {
          id: 'gid://shopify/Product/123',
          title: 'Test Product',
          image: 'https://example.com/image.jpg',
          requiredPoints: 100,
          variantId: '456',
          inventoryQuantity: 10,
        },
      ]);
    });
  });

  describe('exchangeItem', () => {
    it('should exchange item successfully', async () => {
      const mockDraftOrderResponse = {
        data: {
          draft_order: {
            admin_graphql_api_id: 'gid://shopify/DraftOrder/789',
          },
        },
      };

      const mockCompleteResponse = {
        data: {
          data: {
            draftOrderComplete: {
              draftOrder: {
                id: 'gid://shopify/Order/789',
                name: '#1001',
                status: 'completed',
              },
              userErrors: [],
            },
          },
        },
      };

      (axios.post as jest.Mock)
        .mockResolvedValueOnce(mockDraftOrderResponse)
        .mockResolvedValueOnce(mockCompleteResponse);

      const result = await service.exchangeItem(123, 456, 100);

      expect(rewardPointsService.usePoints).toHaveBeenCalledWith({
        customerId: '123',
        amount: 100,
        description: '交換所で商品と交換',
      });

      expect(result).toEqual({
        message: '顧客:123 がアイテム:456を100ptで交換',
        draftOrder: {
          id: 'gid://shopify/Order/789',
          name: '#1001',
          status: 'completed',
        },
      });
    });

    it('should throw error when variantId is missing', async () => {
      await expect(service.exchangeItem(123, 0, 100)).rejects.toThrow(
        '交換中にエラーが発生しました',
      );
    });
  });
});
