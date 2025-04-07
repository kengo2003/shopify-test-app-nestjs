import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsPositive,
  IsNotEmpty,
  IsString,
  IsOptional,
} from 'class-validator';

export class UseRewardPointsDto {
  @ApiProperty({
    description: 'カスタマーID',
    example: '1234567890',
  })
  @IsNotEmpty()
  @IsString()
  readonly customerId: string;

  @ApiProperty({
    description: '使用ポイント数',
    example: 50,
  })
  @IsNumber()
  @IsPositive()
  readonly amount: number;

  @ApiProperty({
    description: 'ポイント使用理由',
    example: '景品交換',
  })
  @IsString()
  @IsOptional()
  readonly description?: string;

  @ApiProperty({
    description: 'ガチャ結果ID',
    example: 'gacha-result-12345',
  })
  @IsString()
  @IsOptional()
  readonly gachaResultId?: string;
} 