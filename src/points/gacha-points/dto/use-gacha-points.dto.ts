import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsPositive,
  IsNotEmpty,
  IsString,
  IsOptional,
} from 'class-validator';

export class UseGachaPointsDto {
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
    example: 'ガチャ引き',
  })
  @IsString()
  @IsOptional()
  readonly description?: string;

  @ApiProperty({
    description: '注文ID',
    example: 'gid://shopify/Order/123456789',
  })
  @IsString()
  @IsOptional()
  readonly orderId?: string;
} 