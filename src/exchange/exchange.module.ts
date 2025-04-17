import { Module } from '@nestjs/common';
import { ExchangeController } from './exchange.controller';
import { ExchangeService } from './exchange.service';
import { DraftOrdersModule } from '../draft-orders/draft-orders.module';
import { RewardPointsModule } from '../points/reward-points/reward-points.module';

@Module({
  imports: [DraftOrdersModule, RewardPointsModule],
  controllers: [ExchangeController],
  providers: [ExchangeService],
})
export class ExchangeModule {}
