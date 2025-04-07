import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddGachaPointsDto } from './dto/add-gacha-points.dto';
import { UseGachaPointsDto } from './dto/use-gacha-points.dto';

@Injectable()
export class GachaPointsService {
  constructor(private readonly prisma: PrismaService) {}

  async addPoints(dto: AddGachaPointsDto) {
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

  async usePoints(dto: UseGachaPointsDto) {
    // 現在の残高を取得
    const currentBalance = await this.getBalance(dto.customerId);

    // 残高不足チェック
    if (currentBalance < dto.amount) {
      throw new BadRequestException(
        `ガチャポイントが不足しています。必要: ${dto.amount}, 残高: ${currentBalance}`,
      );
    }

    return this.prisma.gachaPointTransaction.create({
      data: {
        customerId: dto.customerId,
        amount: -dto.amount, // マイナス値で記録
        description: dto.description,
        orderId: dto.orderId,
        balanceAtTransaction: currentBalance - dto.amount,
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
