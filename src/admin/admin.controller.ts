import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiKeyGuard } from 'src/guards/api-key.guard';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('customer-gacha-points')
  @UseGuards(ApiKeyGuard)
  async getCustomerGachaPoints(
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.adminService.getCustomerGachaPoints(page, limit);
  }

  @Get('customer-reward-points')
  @UseGuards(ApiKeyGuard)
  async getCustomerRewardPoints(
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.adminService.getCustomerRewardPoints(page, limit);
  }
}
