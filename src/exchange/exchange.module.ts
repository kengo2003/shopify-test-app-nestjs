import { Module } from '@nestjs/common';
import { ExchangeController } from './exchange.controller';
import { ExchangeService } from './exchange.service';
import { DraftOrdersModule } from '../draft-orders/draft-orders.module';

@Module({
  imports: [DraftOrdersModule],
  controllers: [ExchangeController],
  providers: [ExchangeService],
})
export class ExchangeModule {}
