import { AccountModule } from './account/index.js';
import { AnalyticsModule } from './analytics/index.js';
import { ChallengesModule } from './challenges/index.js';
import { CrewsModule } from './crews/index.js';
import { EnrollmentsModule } from './enrollments/index.js';
import { ExperimentsModule } from './experiments/index.js';
import { FriendMilestonesModule } from './friend-milestones/index.js';
import { LeaderboardModule } from './leaderboard/index.js';
import { MatchesModule, MatchReminderRivalryModule } from './matches/index.js';
import { MeModule } from './me/index.js';
import { MembershipModule } from './membership/index.js';
import { NotificationsModule } from './notifications/index.js';
import { PracticeModule } from './practice/index.js';
import { ProgressModule } from './progress/index.js';
import { ProofClipsModule } from './proof-clips/index.js';
import { PushDevicesModule } from './push/index.js';
import { RemindersModule } from './reminders/index.js';
import { TipsModule } from './tips/index.js';
import { TodayModule } from './today/index.js';
import { WaitlistModule } from './waitlist/index.js';

export default [
  RemindersModule,
  EnrollmentsModule,
  MeModule,
  AccountModule,
  MembershipModule,
  ChallengesModule,
  TodayModule,
  ProgressModule,
  MatchesModule,
  MatchReminderRivalryModule,
  CrewsModule,
  FriendMilestonesModule,
  PracticeModule,
  ProofClipsModule,
  NotificationsModule,
  LeaderboardModule,
  PushDevicesModule,
  WaitlistModule,
  TipsModule,
  AnalyticsModule,
  ExperimentsModule,
];
