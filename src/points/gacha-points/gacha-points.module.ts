import { Module } from '@nestjs/common';
import { GachaPointsController } from './gacha-points.controller';
import { GachaPointsService } from './gacha-points.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GachaPointsController],
  providers: [GachaPointsService],
  exports: [GachaPointsService],
})
export class GachaPointsModule {}
