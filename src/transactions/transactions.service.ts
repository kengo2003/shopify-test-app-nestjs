import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsePointDto } from './dto/use-point.dto';
import { AddPointDto } from './dto/add-point.dto';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async addPoints(dto: AddPointDto) {
    // 現在の残高を取得
    const currentBalance = await this.getBalance(dto.customerId);

    return this.prisma.transaction.create({
      data: {
        customerId: dto.customerId,
        amount: dto.amount,
        description: dto.description,
        orderId: dto.orderId,
        balanceAtTransaction: currentBalance + dto.amount,
      },
    });
  }

  async usePoints(dto: UsePointDto) {
    const { customerId, amount, description, orderId } = dto;
    // 現在の残高を取得
    const currentBalance = await this.getBalance(customerId);

    return this.prisma.transaction.create({
      data: {
        customerId,
        amount: -amount,
        description,
        orderId,
        balanceAtTransaction: currentBalance - amount,
      },
    });
  }

  async getBalance(customerId: string) {
    const result = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { pointsBalance: true },
    });
    return result?.pointsBalance ?? 0;
  }

  async listTransactions(customerId: string) {
    return this.prisma.transaction.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
