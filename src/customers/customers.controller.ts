import { Controller, Get, Put, Param, Body, Post, Res } from '@nestjs/common';
import { CustomersService } from './customers.service';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // Shopify Webhookからの顧客登録通知を処理
  @Post('webhook/create')
  async handleCustomerCreateWebhook(@Body() webhookData: any, @Res() res) {
    await this.customersService.processCustomerCreateWebhook(webhookData);
    res.status(200).send('Webhook received');
  }

  @Get()
  async getCustomers() {
    return this.customersService.getCustomers();
  }

  @Put(':id')
  async updateCustomer(@Param('id') id: string, @Body() updateData: any) {
    return this.customersService.updateCustomer(id, updateData);
  }
}
