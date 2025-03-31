import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TransactionsController } from './transactions.controller';
import { TransactionService } from './transactions.service';

@Module({
  imports: [PrismaModule],
  controllers: [TransactionsController],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionsModule {}
