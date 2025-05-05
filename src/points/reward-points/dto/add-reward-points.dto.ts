import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsPositive,
  IsNotEmpty,
  IsString,
  IsOptional,
} from 'class-validator';

export class AddRewardPointsDto {
  @ApiProperty({
    description: 'カスタマーID',
    example: '1234567890',
  })
  @IsNotEmpty()
  @IsString()
  readonly customerId: string;

  @ApiProperty({
    description: '追加ポイント数',
    example: 100,
  })
  @IsNumber()
  @IsPositive()
  readonly amount: number;

  @ApiProperty({
    description: 'ポイント追加理由',
    example: 'ガチャ景品',
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