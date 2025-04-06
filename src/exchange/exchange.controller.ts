import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { ExchangeService } from './exchange.service';

@Controller('exchange')
export class ExchangeController {
  constructor(private readonly exchangeService: ExchangeService) {}

  @Get(':productId')
  async getRewardPointValue(@Param('productId') productId: string) {
    return this.exchangeService.getRewardPointValue(productId);
  }

  @Get('points/:customerId')
  async getCustomerPoints() {
    return this.exchangeService.getCustomerPoints();
  }

  @Get('items')
  async getExchangeItems() {
    return this.exchangeService.getExchangeItems();
  }

  @Post()
  async exchangeItem(
    @Body()
    body: {
      customerId: number;
      variantId: number;
      requiredPoints: number;
    },
  ) {
    return this.exchangeService.exchangeItem(
      body.customerId,
      body.variantId,
      body.requiredPoints,
    );
  }
}
