import { AppleModule } from './apple/index.js';
import { AuthRootModule } from './auth/index.js';
import { ConfigModule } from './config/index.js';
import { PrismaModule } from './database/index.js';
import { EvidenceModule } from './evidence/index.js';
import { HealthModule } from './health/index.js';
import { PushInfrastructureModule } from './push/index.js';
import { EngagementModule } from './engagement/index.js';
import { SubscriptionsModule } from './subscriptions/index.js';

export default [
  ConfigModule,
  PrismaModule,
  AuthRootModule,
  EvidenceModule,
  PushInfrastructureModule,
  EngagementModule,
  SubscriptionsModule,
  AppleModule,
  HealthModule,
];
