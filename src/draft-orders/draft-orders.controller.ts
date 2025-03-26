import { Controller, Get, Param } from '@nestjs/common';
import { DraftOrdersService } from './draft-orders.service';

@Controller('apps/draft-orders')
export class DraftOrdersController {
  constructor(private readonly draftOrdersService: DraftOrdersService) {}

  @Get('hallo')
  async getHallo() {
    return this.draftOrdersService.getHallo();
  }

  @Get(':customerId')
  async getDraftOrders(@Param('customerId') customId: string) {
    return this.draftOrdersService.getDraftOrders(customId);
  }
}
