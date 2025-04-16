import { Module } from '@nestjs/common';
import { DraftOrdersService } from './draft-orders.service';
import { DraftOrdersController } from './draft-orders.controller';
import { GachaPointsModule } from '../points/gacha-points/gacha-points.module';

@Module({
  imports: [GachaPointsModule],
  controllers: [DraftOrdersController],
  providers: [DraftOrdersService],
  exports: [DraftOrdersService],
})
export class DraftOrdersModule {}
