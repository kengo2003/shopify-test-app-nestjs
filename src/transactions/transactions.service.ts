import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsePointDto } from './dto/use-point.dto';
import { AddPointDto } from './dto/add-point.dto';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async addPoints(dto: AddPointDto) {
    if (dto.amount <= 0) {
      throw new BadRequestException(
        'ポイント数は0より大きい値である必要があります',
      );
    }

    // 現在の残高を取得
    const currentBalance = await this.getBalance(dto.customerId);

    return this.prisma.gachaPointTransaction.create({
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

    if (amount <= 0) {
      throw new BadRequestException(
        'ポイント数は0より大きい値である必要があります',
      );
    }

    // 現在の残高を取得
    const currentBalance = await this.getBalance(customerId);

    if (currentBalance < amount) {
      throw new BadRequestException('残高が不足しています');
    }

    return this.prisma.gachaPointTransaction.create({
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
      select: { gachaPoints: true },
    });
    return result?.gachaPoints ?? 0;
  }

  async listTransactions(customerId: string) {
    return this.prisma.gachaPointTransaction.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
