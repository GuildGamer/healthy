import { Module } from '@nestjs/common';
import { EngagementModule } from '../../shared-modules/engagement/index.js';
import { PracticeModule } from '../practice/index.js';
import { StreakModule } from '../streak/index.js';
import { ChallengesController } from './challenges.controller.js';
import { ChallengesService } from './challenges.service.js';

@Module({
  imports: [PracticeModule, EngagementModule, StreakModule],
  controllers: [ChallengesController],
  providers: [ChallengesService],
  exports: [ChallengesService],
})
export class ChallengesModule {}
