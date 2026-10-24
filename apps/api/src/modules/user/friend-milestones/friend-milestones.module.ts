import { Module } from '@nestjs/common';
import { EngagementModule } from '../../shared-modules/engagement/index.js';
import { CrewsModule } from '../crews/index.js';
import { FriendMilestoneNotifierService } from './friend-milestone-notifier.service.js';

@Module({
  imports: [CrewsModule, EngagementModule],
  providers: [FriendMilestoneNotifierService],
  exports: [FriendMilestoneNotifierService],
})
export class FriendMilestonesModule {}
