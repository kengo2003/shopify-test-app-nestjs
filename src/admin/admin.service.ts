import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { PrismaService } from 'src/prisma/prisma.service';

dotenv.config();

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getCustomerGachaPoints(page: number, limit: number) {
    const customers = await this.prisma.customer.findMany({
      skip: (page - 1) * limit,
      take: limit,
    });
    return customers;
  }

  async getCustomerRewardPoints(page: number, limit: number) {
    const customers = await this.prisma.customer.findMany({
      skip: (page - 1) * limit,
      take: limit,
    });
    return customers;
  }
}
