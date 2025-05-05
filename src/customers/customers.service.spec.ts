import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

jest.mock('axios');
jest.mock('../prisma/prisma.service');

describe('CustomersService', () => {
  let service: CustomersService;

  const mockPrismaService = {
    customer: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    inviteCode: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    gachaPointTransaction: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCustomers', () => {
    it('should return customers from Shopify', async () => {
      const mockCustomers = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
      ];

      (axios.post as jest.Mock).mockResolvedValue({
        data: {
          data: {
            customers: {
              edges: mockCustomers.map((customer) => ({ node: customer })),
            },
          },
        },
      });

      const result = await service.getCustomers();
      expect(result).toEqual(mockCustomers);
      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.any(Object),
      );
    });
  });

  describe('updateCustomer', () => {
    it('should update customer information', async () => {
      const customerId = '123';
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
      };

      const mockResponse = {
        data: {
          data: {
            customerUpdate: {
              customer: {
                id: customerId,
                ...updateData,
              },
              userErrors: [],
            },
          },
        },
      };

      (axios.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.updateCustomer(customerId, updateData);
      expect(result).toEqual(mockResponse.data.data.customerUpdate.customer);
      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should throw error when update fails', async () => {
      const customerId = '123';
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
      };

      const mockResponse = {
        data: {
          data: {
            customerUpdate: {
              customer: null,
              userErrors: [{ message: 'Update failed' }],
            },
          },
        },
      };

      (axios.post as jest.Mock).mockResolvedValue(mockResponse);
      jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        service.updateCustomer(customerId, updateData),
      ).rejects.toThrow('Update failed');

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('createCustomer', () => {
    it('should create a new customer with invite code', async () => {
      const customerId = '123';
      const mockCustomer = {
        id: customerId,
        gachaPoints: 0,
        rewardPoints: 0,
        inviteCodes: [
          {
            code: 'ABC123',
            maxUses: 10,
            currentUses: 0,
            isActive: true,
            expiresAt: expect.any(Date),
          },
        ],
      };

      mockPrismaService.customer.create.mockResolvedValue(mockCustomer);

      const result = await service.createCustomer(customerId);
      expect(result).toEqual(mockCustomer);
      expect(mockPrismaService.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: customerId,
            gachaPoints: 0,
            rewardPoints: 0,
            inviteCodes: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('useInviteCode', () => {
    it('should successfully use an invite code', async () => {
      const customerId = '123';
      const inviteCode = 'ABC123';
      const mockCustomer = {
        id: customerId,
        gachaPoints: 0,
        inviteCodes: [
          {
            id: '1',
            code: inviteCode,
            maxUses: 10,
            currentUses: 0,
            expiresAt: new Date(Date.now() + 1000000),
          },
        ],
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.inviteCode.update.mockResolvedValue({});
      mockPrismaService.customer.update.mockResolvedValue({});
      mockPrismaService.gachaPointTransaction.create.mockResolvedValue({});

      const result = await service.useInviteCode(customerId, {
        inviteCode,
      });

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.inviteCode.update).toHaveBeenCalled();
      expect(mockPrismaService.customer.update).toHaveBeenCalled();
      expect(mockPrismaService.gachaPointTransaction.create).toHaveBeenCalled();
    });

    it('should throw error when customer not found', async () => {
      const customerId = '123';
      const inviteCode = 'ABC123';

      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      await expect(
        service.useInviteCode(customerId, { inviteCode }),
      ).rejects.toThrow('Customer not found');
    });
  });

  describe('validateInviteCode', () => {
    it('should validate a valid invite code', async () => {
      const code = 'ABC123';
      const mockInviteCode = {
        code,
        isActive: true,
        expiresAt: new Date(Date.now() + 1000000),
        maxUses: 10,
        currentUses: 0,
      };

      mockPrismaService.inviteCode.findUnique.mockResolvedValue(mockInviteCode);

      const result = await service.validateInviteCode(code);
      expect(result).toEqual({ success: true, inviteCode: mockInviteCode });
    });

    it('should return error when invite code not found', async () => {
      const code = 'ABC123';

      mockPrismaService.inviteCode.findUnique.mockResolvedValue(null);

      const result = await service.validateInviteCode(code);
      expect(result).toEqual({
        success: false,
        error: 'Invite code not found',
      });
    });
  });

  describe('processCustomerCreateWebhook', () => {
    it('should process customer create webhook successfully', async () => {
      const webhookData = {
        id: '123',
      };

      mockPrismaService.customer.create.mockResolvedValue({
        id: '123',
        gachaPoints: 0,
        rewardPoints: 0,
      });

      await service.processCustomerCreateWebhook(webhookData);

      expect(mockPrismaService.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: '123',
            gachaPoints: 0,
            rewardPoints: 0,
          }),
        }),
      );
    });

    it('should handle existing customer gracefully', async () => {
      const webhookData = {
        id: '123',
      };

      const error = new Error() as Error & { code?: string };
      error.code = 'P2002';
      mockPrismaService.customer.create.mockRejectedValue(error);

      await service.processCustomerCreateWebhook(webhookData);

      expect(mockPrismaService.customer.create).toHaveBeenCalled();
    });

    it('should throw error for other types of errors', async () => {
      const webhookData = {
        id: '123',
      };

      const error = new Error('Database error');
      mockPrismaService.customer.create.mockRejectedValue(error);

      await expect(
        service.processCustomerCreateWebhook(webhookData),
      ).rejects.toThrow('Database error');
    });
  });

  describe('generateUniqueInviteCode', () => {
    it('should generate a unique invite code', async () => {
      const mockCode = 'ABC123';
      jest
        .spyOn(service as any, 'generateRandomString')
        .mockReturnValue(mockCode);
      mockPrismaService.inviteCode.findUnique.mockResolvedValue(null);

      const result = await (service as any).generateUniqueInviteCode();

      expect(result).toBe(mockCode);
      expect(mockPrismaService.inviteCode.findUnique).toHaveBeenCalledWith({
        where: { code: mockCode },
      });
    });

    it('should try multiple times if code exists', async () => {
      const mockCodes = ['ABC123', 'DEF456', 'GHI789'];
      let callCount = 0;

      jest
        .spyOn(service as any, 'generateRandomString')
        .mockImplementation(() => {
          return mockCodes[callCount++];
        });

      mockPrismaService.inviteCode.findUnique
        .mockResolvedValueOnce({ code: 'ABC123' })
        .mockResolvedValueOnce({ code: 'DEF456' })
        .mockResolvedValueOnce(null);

      const result = await (service as any).generateUniqueInviteCode();

      expect(result).toBe('GHI789');
      expect(mockPrismaService.inviteCode.findUnique).toHaveBeenCalledTimes(3);
    });
  });

  describe('generateRandomString', () => {
    it('should generate a random string of specified length', () => {
      const length = 8;
      const result = (service as any).generateRandomString(length);

      expect(result).toHaveLength(length);
      expect(result).toMatch(/^[A-Z0-9]+$/);
    });
  });

  describe('getInviteCode', () => {
    it('should return active invite code for customer', async () => {
      const customerId = '123';
      const mockInviteCode = {
        id: '1',
        code: 'ABC123',
        isActive: true,
      };

      mockPrismaService.inviteCode.findFirst.mockResolvedValue(mockInviteCode);

      const result = await service.getInviteCode(customerId);

      expect(result).toEqual(mockInviteCode);
      expect(mockPrismaService.inviteCode.findFirst).toHaveBeenCalledWith({
        where: {
          customerId,
          isActive: true,
        },
      });
    });

    it('should return null if no active invite code found', async () => {
      const customerId = '123';
      mockPrismaService.inviteCode.findFirst.mockResolvedValue(null);

      const result = await service.getInviteCode(customerId);

      expect(result).toBeNull();
    });
  });
});
