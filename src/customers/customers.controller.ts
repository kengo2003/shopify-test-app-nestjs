import { Controller, Get, Put, Param, Body, Post, Res } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { ApiBody } from '@nestjs/swagger';

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

  @Get(':id')
  async getCustomer(@Param('id') id: string) {
    return this.customersService.getCustomer(id);
  }

  @Put(':id')
  async updateCustomer(@Param('id') id: string, @Body() updateData: any) {
    return this.customersService.updateCustomer(id, updateData);
  }

  @Get(':id/invite-code')
  async getInviteCode(@Param('id') id: string) {
    return this.customersService.getInviteCode(id);
  }

  @Post(':id/use-invite-code')
  async useInviteCode(@Param('id') id: string, @Body() body: any) {
    return this.customersService.useInviteCode(id, body);
  }

  @Post('/invite-code/validate')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'INVITE123' },
      },
      required: ['code'],
    },
  })
  async validateInviteCode(@Body() body: { code: string }) {
    return this.customersService.validateInviteCode(body.code);
  }
}
