import { Module } from '@nestjs/common';
import { EntitlementService } from './entitlement.service.js';
import { SubscriptionLifecycleService } from './subscription-lifecycle.service.js';

@Module({
  providers: [EntitlementService, SubscriptionLifecycleService],
  exports: [EntitlementService, SubscriptionLifecycleService],
})
export class SubscriptionsModule {}
