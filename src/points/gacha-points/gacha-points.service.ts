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

  async handleShopifyWebhook(webhookData: any) {
    console.log(
      'Shopify webhook received order created:',
      JSON.stringify(webhookData, null, 2),
    );

    // webhookデータから必要な情報を抽出
    const customerId = webhookData.customer?.id;
    const lineItems = webhookData.line_items || [];

    // ポイント計算ロジック
    const pointsEarned = lineItems.reduce((acc, item) => {
      if (item.sku && item.sku.startsWith('point_')) {
        return acc + parseInt(item.sku.replace('point_', ''));
      }
      return acc;
    }, 0);

    if (!customerId) {
      console.error('Customer ID not found in webhook data');
      return { success: false, message: 'Customer ID not found' };
    }

    if (pointsEarned <= 0) {
      console.log('No points to add from this order');
      return { success: true, message: 'No points to add' };
    }

    try {
      await this.addPoints({
        customerId,
        amount: pointsEarned,
        description: 'Shopify注文からのポイント付与',
        orderId: webhookData.id?.toString(),
      });

      return {
        success: true,
        message: `${pointsEarned}ポイントを追加しました`,
      };
    } catch (error) {
      console.error('Error adding points:', error);
      return { success: false, message: 'ポイント追加に失敗しました' };
    }
  }
}
