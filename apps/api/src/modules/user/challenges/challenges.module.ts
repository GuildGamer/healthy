import { Module, forwardRef } from '@nestjs/common';
import { EngagementModule } from '../../shared-modules/engagement/index.js';
import { MatchesModule } from '../matches/index.js';
import { StreakModule } from '../streak/index.js';
import { ChallengesController } from './challenges.controller.js';
import { ChallengesService } from './challenges.service.js';

@Module({
  imports: [EngagementModule, StreakModule, forwardRef(() => MatchesModule)],
  controllers: [ChallengesController],
  providers: [ChallengesService],
  exports: [ChallengesService],
})
export class ChallengesModule {}
