import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { DraftOrdersService } from './draft-orders.service';

@Controller('apps/draft-orders')
export class DraftOrdersController {
  constructor(private readonly draftOrdersService: DraftOrdersService) {}

  @Get('hello')
  async getHallo() {
    return this.draftOrdersService.getHello();
  }

  @Get(':customerId')
  async getDraftOrders(@Param('customerId') customId: string) {
    return this.draftOrdersService.getDraftOrders(customId);
  }

  @Post('create')
  async createOrder(@Body() body: { draftOrderId: string }) {
    const result = this.draftOrdersService.createOrder(body.draftOrderId);
    return {
      message: 'Draft order completed successfully',
      order: result,
    };
  }

  // @Post('delete')
  // async handleDraftOrderDelete(
  //   @Body() body: { productId: string; quantity: number },
  // ) {
  //   await this.draftOrdersService.handleDraftOrderDelete(body);
  // res.status(200).send('Webhook received');
  // }
}
