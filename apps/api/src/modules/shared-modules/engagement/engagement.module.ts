import { Module } from '@nestjs/common';
import { PushInfrastructureModule } from '../push/index.js';
import { ReminderContextLoaderService } from './copy/reminder-context-loader.service.js';
import { ReminderDispatchController } from './dispatch/reminder-dispatch.controller.js';
import { ReminderDispatcherService } from './dispatch/reminder-dispatcher.service.js';
import { ReminderScheduler } from './dispatch/reminder-scheduler.js';
import { EngagementDeliveryService } from './engagement-delivery.service.js';
import { EngagementHoldoutService } from './engagement-holdout.service.js';
import { EngagementPolicyService } from './policy/engagement-policy.service.js';

@Module({
  imports: [PushInfrastructureModule],
  controllers: [ReminderDispatchController],
  providers: [
    EngagementHoldoutService,
    EngagementPolicyService,
    ReminderContextLoaderService,
    EngagementDeliveryService,
    ReminderDispatcherService,
    ReminderScheduler,
  ],
  exports: [
    EngagementHoldoutService,
    EngagementPolicyService,
    EngagementDeliveryService,
    ReminderDispatcherService,
  ],
})
export class EngagementModule {}
