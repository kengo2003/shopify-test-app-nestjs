import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddRewardPointsDto } from './dto/add-reward-points.dto';
import { UseRewardPointsDto } from './dto/use-reward-points.dto';

@Injectable()
export class RewardPointsService {
  constructor(private readonly prisma: PrismaService) {}

  async addPoints(dto: AddRewardPointsDto) {
    // 現在の残高を取得
    const currentBalance = await this.getBalance(dto.customerId);

    return this.prisma.rewardPointTransaction.create({
      data: {
        customerId: dto.customerId,
        amount: dto.amount,
        description: dto.description,
        gachaResultId: dto.gachaResultId,
        balanceAtTransaction: currentBalance + dto.amount,
      },
    });
  }

  async usePoints(dto: UseRewardPointsDto) {
    // 現在の残高を取得
    const currentBalance = await this.getBalance(dto.customerId);

    // 残高不足チェック
    if (currentBalance < dto.amount) {
      throw new BadRequestException(
        `報酬ポイントが不足しています。必要: ${dto.amount}, 残高: ${currentBalance}`,
      );
    }

    return this.prisma.rewardPointTransaction.create({
      data: {
        customerId: dto.customerId,
        amount: -dto.amount, // マイナス値で記録
        description: dto.description,
        gachaResultId: dto.gachaResultId,
        balanceAtTransaction: currentBalance - dto.amount,
      },
    });
  }

  async getBalance(customerId: string) {
    const transactions = await this.prisma.rewardPointTransaction.findMany({
      where: { customerId },
    });

    // 全トランザクションの合計を計算
    return transactions.reduce((sum, tx) => sum + tx.amount, 0);
  }

  async listTransactions(customerId: string) {
    return this.prisma.rewardPointTransaction.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
