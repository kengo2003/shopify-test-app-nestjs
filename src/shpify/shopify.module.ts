import { Module } from '@nestjs/common';
import { ShopifyService } from './shopify.service';
import { ShopifyController } from './shopify.controller';

@Module({
  controllers: [ShopifyController],
  providers: [ShopifyService],
})
export class ShopifyModule {}
