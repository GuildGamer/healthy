import { Module } from '@nestjs/common';
import { MatchesModule } from '../matches/index.js';
import { StreakModule } from '../streak/index.js';
import { PracticeController } from './practice.controller.js';
import { PracticeService } from './practice.service.js';

@Module({
  imports: [StreakModule, MatchesModule],
  controllers: [PracticeController],
  providers: [PracticeService],
  exports: [PracticeService],
})
export class PracticeModule {}
