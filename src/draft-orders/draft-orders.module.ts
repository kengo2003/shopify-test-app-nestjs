import { Module } from '@nestjs/common';
import { DraftOrdersService } from './draft-orders.service';
import { DraftOrdersController } from './draft-orders.controller';

@Module({
  controllers: [DraftOrdersController],
  providers: [DraftOrdersService],
})
export class DraftOrdersModule {}
