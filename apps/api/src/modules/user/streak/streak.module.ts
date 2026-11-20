import { Module } from '@nestjs/common';
import { FriendMilestonesModule } from '../friend-milestones/index.js';
import { StreakService } from './streak.service.js';

@Module({
  imports: [FriendMilestonesModule],
  providers: [StreakService],
  exports: [StreakService],
})
export class StreakModule {}
