import { Module } from '@nestjs/common';
import { ChallengesModule } from '../challenges/index.js';
import { MatchesModule } from '../matches/index.js';
import { StreakModule } from '../streak/index.js';
import { PracticeController } from './practice.controller.js';
import { PracticeService } from './practice.service.js';

@Module({
  imports: [StreakModule, MatchesModule, ChallengesModule],
  controllers: [PracticeController],
  providers: [PracticeService],
  exports: [PracticeService],
})
export class PracticeModule {}
