import { ChallengesModule } from './challenges/index.js';
import { CrewsModule } from './crews/index.js';
import { EnrollmentsModule } from './enrollments/index.js';
import { LeaderboardModule } from './leaderboard/index.js';
import { MatchesModule } from './matches/index.js';
import { MeModule } from './me/index.js';
import { MembershipModule } from './membership/index.js';
import { NotificationsModule } from './notifications/index.js';
import { PracticeModule } from './practice/index.js';
import { PushDevicesModule } from './push/index.js';
import { RemindersModule } from './reminders/index.js';
import { TipsModule } from './tips/index.js';
import { WaitlistModule } from './waitlist/index.js';

export default [
  RemindersModule,
  EnrollmentsModule,
  MeModule,
  MembershipModule,
  ChallengesModule,
  MatchesModule,
  CrewsModule,
  PracticeModule,
  NotificationsModule,
  LeaderboardModule,
  PushDevicesModule,
  WaitlistModule,
  TipsModule,
];
