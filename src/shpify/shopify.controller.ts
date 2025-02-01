import { Controller, Get } from '@nestjs/common';
import { ShopifyService } from './shopify.service';

@Controller('shopify')
export class ShopifyController {
  constructor(private readonly shopifyService: ShopifyService) {}

  @Get('products')
  async getProducts() {
    return this.shopifyService.getProducts();
  }

  @Get('customers')
  async getCustomers() {
    return this.shopifyService.getCustomers();
  }
}
