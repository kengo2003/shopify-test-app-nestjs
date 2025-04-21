import { Test, TestingModule } from '@nestjs/testing';
import { DraftOrdersService } from './draft-orders.service';
import { GachaPointsService } from '../points/gacha-points/gacha-points.service';
import axios from 'axios';

jest.mock('axios');

describe('DraftOrdersService', () => {
  let service: DraftOrdersService;
  let gachaPointsService: GachaPointsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DraftOrdersService,
        {
          provide: GachaPointsService,
          useValue: {
            addPoints: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DraftOrdersService>(DraftOrdersService);
    gachaPointsService = module.get<GachaPointsService>(GachaPointsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHello', () => {
    it('should return "Hello"', async () => {
      const result = await service.getHello();
      expect(result).toBe('Hello');
    });
  });

  describe('getDraftOrders', () => {
    it('should fetch draft orders successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            draftOrders: {
              pageInfo: {
                hasNextPage: false,
                endCursor: 'cursor123',
              },
              edges: [
                {
                  cursor: 'cursor123',
                  node: {
                    id: 'gid://shopify/DraftOrder/123',
                    name: 'Draft Order #1',
                    totalPrice: '100.00',
                    status: 'open',
                  },
                },
              ],
            },
          },
        },
      };

      (axios.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.getDraftOrders('customer123', 30);

      expect(result).toEqual({
        pageInfo: mockResponse.data.data.draftOrders.pageInfo,
        edges: mockResponse.data.data.draftOrders.edges,
      });
    });

    it('should handle errors when fetching draft orders', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('API Error'));

      await expect(service.getDraftOrders('customer123')).rejects.toThrow(
        '下書き注文の取得に失敗しました',
      );
    });
  });

  describe('createOrder', () => {
    it('should create an order successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            draftOrderComplete: {
              draftOrder: {
                order: {
                  id: 'gid://shopify/Order/123',
                  name: '#1001',
                  createdAt: '2024-04-20T12:00:00Z',
                },
              },
              userErrors: [],
            },
          },
        },
      };

      (axios.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.createOrder('123');

      expect(result).toEqual(
        mockResponse.data.data.draftOrderComplete.draftOrder.order,
      );
    });

    it('should handle GraphQL errors', async () => {
      const mockResponse = {
        data: {
          errors: [{ message: 'GraphQL Error' }],
        },
      };

      (axios.post as jest.Mock).mockResolvedValue(mockResponse);

      await expect(service.createOrder('123')).rejects.toThrow(
        'Shopify GraphQL error',
      );
    });
  });

  describe('delete', () => {
    it('should delete a draft order successfully', async () => {
      (axios.delete as jest.Mock).mockResolvedValue({});

      const result = await service.delete('123');

      expect(result).toEqual({ message: '[delete] Draft order 123' });
    });

    it('should handle errors when deleting a draft order', async () => {
      (axios.delete as jest.Mock).mockRejectedValue(new Error('Delete Error'));

      await expect(service.delete('123')).rejects.toThrow(
        'Failed to delete draft order',
      );
    });
  });

  describe('deleteFn', () => {
    it('should delete draft order and add points successfully', async () => {
      const mockAddPoints = jest.fn().mockResolvedValue({});
      (gachaPointsService.addPoints as jest.Mock) = mockAddPoints;
      (axios.delete as jest.Mock).mockResolvedValue({});

      const result = await service.deleteFn('123', '456', 100);

      expect(mockAddPoints).toHaveBeenCalledWith({
        customerId: '456',
        amount: 100,
        description: 'ポイント変換による加算',
        orderId: '123',
      });
      expect(result).toEqual({
        message: '[deleteFn] Draft order deleted and Add point',
      });
    });

    it('should handle errors when deleting and adding points', async () => {
      (gachaPointsService.addPoints as jest.Mock).mockRejectedValue(
        new Error('Add Points Error'),
      );

      await expect(service.deleteFn('123', '456', 100)).rejects.toThrow(
        'ポイント加算または注文削除に失敗しました',
      );
    });
  });
});
