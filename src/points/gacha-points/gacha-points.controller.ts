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
    return this.gachaPointsService.handleShopifyWebhook(webhookData);
  }
}
