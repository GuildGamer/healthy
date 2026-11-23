import { Module, forwardRef } from '@nestjs/common';
import { EngagementModule } from '../../shared-modules/engagement/index.js';
import { StorageModule } from '../../shared-modules/storage/index.js';
import { MatchesModule } from '../matches/matches.module.js';
import { StreakModule } from '../streak/index.js';
import { ChallengesController } from './challenges.controller.js';
import { ChallengesService } from './challenges.service.js';
import { GymPhotoRetentionController } from './gym-photo-retention.controller.js';
import { GymPhotoRetentionService } from './gym-photo-retention.service.js';

@Module({
  imports: [
    EngagementModule,
    StreakModule,
    StorageModule,
    forwardRef(() => MatchesModule),
  ],
  controllers: [ChallengesController, GymPhotoRetentionController],
  providers: [ChallengesService, GymPhotoRetentionService],
  exports: [ChallengesService],
})
export class ChallengesModule {}
