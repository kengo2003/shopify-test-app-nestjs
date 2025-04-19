import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as dotenv from 'dotenv';
import { PrismaService } from 'src/prisma/prisma.service';

dotenv.config();

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getCustomerGachaPoints(page: number, limit: number) {
    try {
      const [customers, total] = await Promise.all([
        this.prisma.customer.findMany({
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.customer.count(),
      ]);

      if (customers.length === 0 && page > 1) {
        throw new NotFoundException('No customers found for this page');
      }

      return {
        data: customers,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to fetch customer gacha points',
      );
    }
  }

  async getCustomerRewardPoints(page: number, limit: number) {
    try {
      const [customers, total] = await Promise.all([
        this.prisma.customer.findMany({
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.customer.count(),
      ]);

      if (customers.length === 0 && page > 1) {
        throw new NotFoundException('No customers found for this page');
      }

      return {
        data: customers,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to fetch customer reward points',
      );
    }
  }

  async getCustomer(id: string) {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id },
      });
      if (!customer) {
        throw new Error('Customer not found');
      }
      return customer;
    } catch (error) {
      console.error('Error fetching customer:', error);
      throw error;
    }
  }

  async updateCustomerPoints(id: string, body: any) {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id },
      });
      if (!customer) {
        throw new Error('Customer not found');
      }

      return this.prisma.customer.update({
        where: { id },
        data: {
          gachaPoints: body.gachaPoints,
          rewardPoints: body.rewardPoints,
        },
      });
    } catch (error) {
      console.error('Error updating customer points:', error);
      throw error;
    }
  }
}
