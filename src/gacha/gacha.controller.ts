import { Controller, Post, Body, Param } from '@nestjs/common';
import { GachaService } from './gacha.service';

@Controller('gacha')
export class GachaController {
  constructor(private readonly gachaService: GachaService) {}

  @Post(':id/draw')
  async drawGacha(@Param('id') gachaId: string, customerId: string) {
    return this.gachaService.drawGacha(gachaId, customerId);
  }

  @Post('create')
  async create(@Body() body: { customerId: string; lineItems: any[] }) {
    return await this.gachaService.createDraftOrder(
      body.customerId,
      body.lineItems,
    );
  }
}
