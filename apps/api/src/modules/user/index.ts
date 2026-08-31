import { ChallengesModule } from './challenges/index.js';
import { EnrollmentsModule } from './enrollments/index.js';
import { LeaderboardModule } from './leaderboard/index.js';
import { MeModule } from './me/index.js';
import { NotificationsModule } from './notifications/index.js';
import { PushDevicesModule } from './push/index.js';
import { RemindersModule } from './reminders/index.js';
import { TipsModule } from './tips/index.js';
import { WaitlistModule } from './waitlist/index.js';

export default [
  RemindersModule,
  EnrollmentsModule,
  MeModule,
  ChallengesModule,
  NotificationsModule,
  LeaderboardModule,
  PushDevicesModule,
  WaitlistModule,
  TipsModule,
];
