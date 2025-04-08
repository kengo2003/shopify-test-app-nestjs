import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GachaPointsService {
  constructor(private readonly prisma: PrismaService) {}

  async addPoints(data: any) {
    // 現在の残高を取得
    const currentBalance = await this.getBalance(data.customerId);

    return this.prisma.gachaPointTransaction.create({
      data: {
        customerId: data.customerId,
        amount: data.amount,
        description: data.description,
        orderId: data.orderId,
        balanceAtTransaction: currentBalance + data.amount,
      },
    });
  }

  async usePoints(data: any) {
    // 現在の残高を取得
    const currentBalance = await this.getBalance(data.customerId);

    // 残高不足チェック
    if (currentBalance < data.amount) {
      throw new BadRequestException(
        `ガチャポイントが不足しています。必要: ${data.amount}, 残高: ${currentBalance}`,
      );
    }

    return this.prisma.gachaPointTransaction.create({
      data: {
        customerId: data.customerId,
        amount: -data.amount, // マイナス値で記録
        description: data.description,
        orderId: data.orderId,
        balanceAtTransaction: currentBalance - data.amount,
      },
    });
  }

  async getBalance(customerId: string) {
    const transactions = await this.prisma.gachaPointTransaction.findMany({
      where: { customerId },
    });

    // 全トランザクションの合計を計算
    return transactions.reduce((sum, tx) => sum + tx.amount, 0);
  }

  async listTransactions(customerId: string) {
    return this.prisma.gachaPointTransaction.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
