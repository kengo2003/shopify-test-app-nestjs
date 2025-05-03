import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DraftOrdersService } from './draft-orders.service';
import { ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';

@Controller('apps/draft-orders')
export class DraftOrdersController {
  constructor(private readonly draftOrdersService: DraftOrdersService) {}

  @Get('hello')
  async getHallo() {
    return this.draftOrdersService.getHello();
  }

  @Get(':customerId')
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  async getDraftOrders(
    @Param('customerId') customerId: string,
    @Query('pageSize') pageSize?: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.draftOrdersService.getDraftOrders(customerId, pageSize, cursor);
  }

  @Post('create')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        orderId: { type: 'string', example: '1234567890' },
      },
      required: ['orderId'],
    },
  })
  async createOrder(@Body() body: { orderId: string }) {
    const result = await this.draftOrdersService.createOrder(body.orderId);
    return {
      message: 'Draft order completed successfully',
      order: result.order,
    };
  }

  @Post('delete')
  async deleteFn(
    @Body() body: { orderId: string; userId: string; point: number },
  ) {
    return this.draftOrdersService.deleteFn(
      body.orderId,
      body.userId,
      body.point,
    );
  }
}

@ApiTags('Batch Operations')
@Controller('batch')
export class DraftOrdersBatchController {
  constructor(private readonly service: DraftOrdersService) {}

  @Post('auto-convert-drafts')
  @HttpCode(HttpStatus.NO_CONTENT)
  async triggerAutoConvert() {
    await this.service.autoConvertOlderThan(7);
  }
}
