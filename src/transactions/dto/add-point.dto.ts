import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsPositive,
  IsNotEmpty,
  IsString,
  IsOptional,
} from 'class-validator';

export class AddPointDto {
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
    example: '商品購入',
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
