import { Controller, Post, Body, Param } from '@nestjs/common';
import { GachaService } from './gacha.service';

@Controller('gacha')
export class GachaController {
  constructor(private readonly gachaService: GachaService) {}

  @Post(':id/draw')
  async drawGacha(
    @Param('id') gachaHandle: string,
    @Body('customerId') customerId: number,
    @Body('amount') amount: number,
  ) {
    return this.gachaService.drawGacha(gachaHandle, customerId, amount);
  }

  @Post('create')
  async create(@Body() body: { customerId: number; lineItems: any[] }) {
    return await this.gachaService.createDraftOrder(
      body.customerId,
      body.lineItems,
    );
  }
}
