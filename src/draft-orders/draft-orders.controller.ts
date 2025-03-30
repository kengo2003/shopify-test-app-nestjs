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
  async createOrder(@Body() body: { orderId: string }) {
    const result = await this.draftOrdersService.createOrder(body.orderId);
    return {
      message: 'Draft order completed successfully',
      order: result.order,
    };
  }

  @Post('delete')
  async deleteFn(
    @Body() body: { orderId: string; userId: string; points: number },
  ) {
    return this.draftOrdersService.deleteFn(
      body.orderId,
      body.userId,
      body.points,
    );
  }
}
