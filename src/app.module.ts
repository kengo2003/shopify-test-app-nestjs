import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ShopifyModule } from './shpify/shopify.module';
import { GachaModule } from './gacha/gacha.module';
import { DraftOrdersModule } from './draft-orders/draft-orders.module';
import { ExchangeModule } from './exchange/exchange.module';
import { GachaPointsModule } from './points/gacha-points/gacha-points.module';
import { RewardPointsModule } from './points/reward-points/reward-points.module';
import { CustomersModule } from './customers/customers.module';

@Module({
  imports: [
    ShopifyModule,
    GachaModule,
    DraftOrdersModule,
    ExchangeModule,
    GachaPointsModule,
    RewardPointsModule,
    CustomersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
