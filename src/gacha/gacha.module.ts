import { Module } from '@nestjs/common';
import { GachaController } from './gacha.controller';
import { GachaService } from './gacha.service';

@Module({
  controllers: [GachaController],
  providers: [GachaService],
})
export class GachaModule {}
