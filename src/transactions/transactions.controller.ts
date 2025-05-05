import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { UsePointDto } from './dto/use-point.dto';
import { TransactionService } from './transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post('use-points')
  async usePoints(@Body() dto: UsePointDto) {
    return this.transactionService.usePoints(dto);
  }

  @Get(':customerId/balance')
  async getBalance(@Param('customerId') customerId: string) {
    return this.transactionService.getBalance(customerId);
  }
}
