import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ShopifyModule } from './shpify/shopify.module';
import { GachaModule } from './gacha/gacha.module';
import { DraftOrdersModule } from './draft-orders/draft-orders.module';

@Module({
  imports: [ShopifyModule, GachaModule, DraftOrdersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
