import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsePointDto } from './dto/use-point.dto';
import { AddPointDto } from './dto/add-point.dto';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async addPoints(dto: AddPointDto) {
    return this.prisma.transaction.create({
      data: {
        customerId: dto.customerId,
        amount: dto.amount,
        description: dto.description,
        orderId: dto.orderId ?? null,
      },
    });
  }

  async usePoints(dto: UsePointDto) {
    const { customerId, amount, description, orderId } = dto;
    return this.prisma.transaction.create({
      data: {
        customerId,
        amount: -amount,
        description,
        orderId: orderId ?? null,
      },
    });
  }

  async getBalance(customerId: string) {
    const result = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { pointBalance: true },
    });
    return result?.pointBalance ?? 0;
  }

  async listTransactions(customerId: string) {
    return this.prisma.transaction.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
