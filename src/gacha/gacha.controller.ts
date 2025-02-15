import { Controller, Post, Param } from '@nestjs/common';
import { GachaService } from './gacha.service';

@Controller('gacha')
export class GachaController {
  constructor(private readonly gachaService: GachaService) {}

  @Post(':id/draw')
  async drawGacha(@Param('id') gachaId: string) {
    return this.gachaService.drawGacha(gachaId);
  }
}
