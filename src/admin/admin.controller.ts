import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Patch,
  Body,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiKeyGuard } from 'src/guards/api-key.guard';
import { ApiBody } from '@nestjs/swagger';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('customer-gacha-points')
  @UseGuards(ApiKeyGuard)
  async getCustomerGachaPoints(
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (isNaN(pageNum) || isNaN(limitNum)) {
      throw new Error('Page and limit must be valid numbers');
    }

    return this.adminService.getCustomerGachaPoints(pageNum, limitNum);
  }

  @Get('customer-reward-points')
  @UseGuards(ApiKeyGuard)
  async getCustomerRewardPoints(
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (isNaN(pageNum) || isNaN(limitNum)) {
      throw new Error('Page and limit must be valid numbers');
    }

    return this.adminService.getCustomerRewardPoints(pageNum, limitNum);
  }

  @Get('customer/:id')
  @UseGuards(ApiKeyGuard)
  async getCustomer(@Param('id') id: string) {
    return this.adminService.getCustomer(id);
  }

  @Patch('customer/:id')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        gachaPoints: { type: 'number' },
        rewardPoints: { type: 'number' },
      },
    },
  })
  @UseGuards(ApiKeyGuard)
  async updateCustomer(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateCustomerPoints(id, body);
  }
}
