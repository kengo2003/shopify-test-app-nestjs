import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { GachaService } from './gacha.service';

@Controller('gacha')
export class GachaController {
  constructor(private readonly gachaService: GachaService) {}

  @Post(':collection/draw')
  async drawGacha(
    @Param('collection') collectionHandle: string,
    @Body('customerId') customerId: number,
    @Body('amount') amount: number,
  ) {
    return this.gachaService.drawGacha(collectionHandle, customerId, amount);
  }

  @Post('create')
  async create(@Body() body: { customerId: number; lineItems: any[] }) {
    return await this.gachaService.createDraftOrder(
      body.customerId,
      body.lineItems,
    );
  }

  @Get('gacha-stock/:handle')
  async getGachaStock(@Param('handle') handle: string) {
    return this.gachaService.getGachaStock(handle);
  }

  @Post('today-draw-count')
  async getTodayDrawCount(
    @Body() body: { gachaId: string; customerId: string },
  ) {
    return this.gachaService.getTodayDrawCount(body.customerId, body.gachaId);
  }
}
