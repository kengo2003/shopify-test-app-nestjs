import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ShopifyModule } from './shpify/shopify.module';

@Module({
  imports: [ShopifyModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
