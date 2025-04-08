import { Module } from '@nestjs/common';
import { GachaController } from './gacha.controller';
import { GachaService } from './gacha.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RewardPointsModule } from '../points/reward-points/reward-points.module';

@Module({
  imports: [PrismaModule, RewardPointsModule],
  controllers: [GachaController],
  providers: [GachaService],
})
export class GachaModule {}
