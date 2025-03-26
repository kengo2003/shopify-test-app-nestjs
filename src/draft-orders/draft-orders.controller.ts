import { Controller, Get, Param } from '@nestjs/common';
import { DraftOrdersService } from './draft-orders.service';

@Controller()
// @Controller('apps/draft-orders')
export class DraftOrdersController {
  constructor(private readonly draftOrdersService: DraftOrdersService) {}

  @Get()
  async getHallo() {
    return this.draftOrdersService.getHello();
  }

  @Get(':customerId')
  async getDraftOrders(@Param('customerId') customId: string) {
    return this.draftOrdersService.getDraftOrders(customId);
  }
}
