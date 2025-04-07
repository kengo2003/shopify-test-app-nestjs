import { Module } from '@nestjs/common';
import { RewardPointsController } from './reward-points.controller';
import { RewardPointsService } from './reward-points.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RewardPointsController],
  providers: [RewardPointsService],
  exports: [RewardPointsService],
})
export class RewardPointsModule {}
