import { Module } from '@nestjs/common';
import { TipsController } from './tips.controller.js';
import { TipsService } from './tips.service.js';

@Module({
  controllers: [TipsController],
  providers: [TipsService],
})
export class TipsModule {}
