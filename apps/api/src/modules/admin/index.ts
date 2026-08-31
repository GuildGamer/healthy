import { AdminAnalyticsModule } from './analytics/index.js';
import { AdminCatalogModule } from './catalog/index.js';
import { AdminMeModule } from './me/index.js';
import { AdminMembersModule } from './members/index.js';
import { AdminMembershipModule } from './membership/index.js';
import { AdminOperatorsModule } from './operators/index.js';
import { AdminTipsModule } from './tips/index.js';
import { AdminWaitlistModule } from './waitlist/index.js';

export default [
  AdminMeModule,
  AdminAnalyticsModule,
  AdminCatalogModule,
  AdminMembershipModule,
  AdminTipsModule,
  AdminWaitlistModule,
  AdminMembersModule,
  AdminOperatorsModule,
];
