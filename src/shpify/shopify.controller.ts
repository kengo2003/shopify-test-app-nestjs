import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  Req,
  Res,
} from '@nestjs/common';
import { ShopifyService } from './shopify.service';

@Controller('shopify')
export class ShopifyController {
  constructor(private readonly shopifyService: ShopifyService) {}

  @Get('products')
  async getProducts() {
    return this.shopifyService.getProducts();
  }

  @Put('products/:id')
  async updateProduct(@Param('id') id: string, @Body() updateData: any) {
    return this.shopifyService.updateProduct(id, updateData);
  }

  @Post('checkout')
  async createDraftOrder(
    @Body() body: { productId: string; quantity: number },
  ) {
    return this.shopifyService.createDraftOrder(body.productId, body.quantity);
  }

  @Post('webhook')
  async handleWebhook(@Req() req, @Res() res) {
    await this.shopifyService.handleOrderWebhook(req.body);
    res.status(200).send('Webhook received');
  }

  @Post('draft_orders/delete')
  async handleDraftOrderDelete(@Body() body: any, @Res() res) {
    await this.shopifyService.handleDraftOrderDelete(body);
    res.status(200).send('Webhook received');
  }
}
