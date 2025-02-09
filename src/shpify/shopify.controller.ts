import { Controller, Get, Put, Post, Param, Body } from '@nestjs/common';
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

  @Get('customers')
  async getCustomers() {
    return this.shopifyService.getCustomers();
  }

  @Put('customers/:id')
  async updateCustomer(@Param('id') id: string, @Body() updateData: any) {
    return this.shopifyService.updateCustomer(id, updateData);
  }

  @Post('checkout')
  async createDraftOrder(
    @Body() body: { productId: string; quantity: number },
  ) {
    return this.shopifyService.createDraftOrder(body.productId, body.quantity);
  }
}
