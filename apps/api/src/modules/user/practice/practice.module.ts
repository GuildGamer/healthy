import { Module } from '@nestjs/common';
import { StreakModule } from '../streak/index.js';
import { PracticeController } from './practice.controller.js';
import { PracticeService } from './practice.service.js';

@Module({
  imports: [StreakModule],
  controllers: [PracticeController],
  providers: [PracticeService],
  exports: [PracticeService],
})
export class PracticeModule {}
