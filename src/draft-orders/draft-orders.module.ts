import { Module, forwardRef } from '@nestjs/common';
import { DraftOrdersService } from './draft-orders.service';
import { DraftOrdersController } from './draft-orders.controller';
import { GachaPointsModule } from '../points/gacha-points/gacha-points.module';
import { GachaModule } from '../gacha/gacha.module';

@Module({
  imports: [GachaPointsModule, forwardRef(() => GachaModule)],
  controllers: [DraftOrdersController],
  providers: [DraftOrdersService],
  exports: [DraftOrdersService],
})
export class DraftOrdersModule {}
