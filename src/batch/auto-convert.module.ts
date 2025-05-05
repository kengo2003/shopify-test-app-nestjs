import { Module } from '@nestjs/common';
import { AutoConvertService } from './auto-convert.service';
import { DraftOrdersBatchController } from './auto-convert.controller';
import { DraftOrdersModule } from '../draft-orders/draft-orders.module';

@Module({
  imports: [DraftOrdersModule],
  providers: [AutoConvertService],
  controllers: [DraftOrdersBatchController],
})
export class AutoConvertModule {}
