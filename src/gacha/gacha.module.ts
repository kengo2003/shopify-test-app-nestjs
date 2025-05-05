import { Module, forwardRef } from '@nestjs/common';
import { GachaController } from './gacha.controller';
import { GachaService } from './gacha.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RewardPointsModule } from '../points/reward-points/reward-points.module';
import { GachaPointsModule } from '../points/gacha-points/gacha-points.module';
import { ExchangeModule } from '../exchange/exchange.module';
import { DraftOrdersModule } from '../draft-orders/draft-orders.module';

@Module({
  imports: [
    PrismaModule,
    RewardPointsModule,
    GachaPointsModule,
    ExchangeModule,
    forwardRef(() => DraftOrdersModule),
  ],
  controllers: [GachaController],
  providers: [GachaService],
  exports: [GachaService],
})
export class GachaModule {}
