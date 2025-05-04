import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AutoConvertService } from './auto-convert.service';

@ApiTags('Batch Operations')
@Controller('batch')
export class DraftOrdersBatchController {
  constructor(private readonly service: AutoConvertService) {}

  @Post('auto-convert')
  @HttpCode(HttpStatus.NO_CONTENT)
  async triggerAutoConvert() {
    await this.service.autoConvertOlderThan(7);
  }
}
