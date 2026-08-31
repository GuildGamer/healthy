import { AuthRootModule } from './auth/index.js';
import { ConfigModule } from './config/index.js';
import { PrismaModule } from './database/index.js';
import { EvidenceModule } from './evidence/index.js';
import { HealthModule } from './health/index.js';
import { PushInfrastructureModule } from './push/index.js';
import { ReminderDispatchModule } from './reminders/index.js';

export default [
  ConfigModule,
  PrismaModule,
  AuthRootModule,
  EvidenceModule,
  PushInfrastructureModule,
  ReminderDispatchModule,
  HealthModule,
];
