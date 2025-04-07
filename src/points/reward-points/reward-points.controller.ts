import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RewardPointsService } from './reward-points.service';
import { AddRewardPointsDto } from './dto/add-reward-points.dto';
import { UseRewardPointsDto } from './dto/use-reward-points.dto';

@ApiTags('reward-points')
@Controller('reward-points')
export class RewardPointsController {
  constructor(private readonly rewardPointsService: RewardPointsService) {}

  @Post('add')
  @ApiOperation({ summary: '報酬ポイントを追加する' })
  @ApiResponse({ status: 201, description: 'ポイントが正常に追加されました' })
  async addPoints(@Body() dto: AddRewardPointsDto) {
    return this.rewardPointsService.addPoints(dto);
  }

  @Post('use')
  @ApiOperation({ summary: '報酬ポイントを使用する' })
  @ApiResponse({ status: 201, description: 'ポイントが正常に使用されました' })
  @ApiResponse({ status: 400, description: 'ポイント残高が不足しています' })
  async usePoints(@Body() dto: UseRewardPointsDto) {
    return this.rewardPointsService.usePoints(dto);
  }

  @Get('balance/:customerId')
  @ApiOperation({ summary: '報酬ポイント残高を取得する' })
  @ApiResponse({ status: 200, description: 'ポイント残高' })
  async getBalance(@Param('customerId') customerId: string) {
    return {
      balance: await this.rewardPointsService.getBalance(customerId),
    };
  }

  @Get('transactions/:customerId')
  @ApiOperation({ summary: '報酬ポイント取引履歴を取得する' })
  @ApiResponse({ status: 200, description: 'ポイント取引履歴' })
  async getTransactions(@Param('customerId') customerId: string) {
    return this.rewardPointsService.listTransactions(customerId);
  }
}
