import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GachaPointsService } from './gacha-points.service';

@ApiTags('gacha-points')
@Controller('gacha-points')
export class GachaPointsController {
  constructor(private readonly gachaPointsService: GachaPointsService) {}

  @Post('add')
  @ApiOperation({ summary: 'ガチャポイントを追加する' })
  @ApiResponse({ status: 201, description: 'ポイントが正常に追加されました' })
  async addPoints(@Body() data: any) {
    console.log('ガチャポイント追加リクエスト:', JSON.stringify(data, null, 2));
    return this.gachaPointsService.addPoints(data);
  }

  @Post('use')
  @ApiOperation({ summary: 'ガチャポイントを使用する' })
  @ApiResponse({ status: 201, description: 'ポイントが正常に使用されました' })
  @ApiResponse({ status: 400, description: 'ポイント残高が不足しています' })
  async usePoints(@Body() data: any) {
    return this.gachaPointsService.usePoints(data);
  }

  @Get('balance/:customerId')
  @ApiOperation({ summary: 'ガチャポイント残高を取得する' })
  @ApiResponse({ status: 200, description: 'ポイント残高' })
  async getBalance(@Param('customerId') customerId: string) {
    return {
      balance: await this.gachaPointsService.getBalance(customerId),
    };
  }

  @Get('transactions/:customerId')
  @ApiOperation({ summary: 'ガチャポイント取引履歴を取得する' })
  @ApiResponse({ status: 200, description: 'ポイント取引履歴' })
  async getTransactions(@Param('customerId') customerId: string) {
    return this.gachaPointsService.listTransactions(customerId);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Shopifyからのwebhookを処理する' })
  @ApiResponse({ status: 201, description: 'webhookが正常に処理されました' })
  async handleShopifyWebhook(@Body() webhookData: any) {
    console.log(
      'Shopify webhook received:',
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

    // サービスメソッドを直接呼び出す
    try {
      await this.gachaPointsService.addPoints({
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
