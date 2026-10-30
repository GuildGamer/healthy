import { Module } from '@nestjs/common';
import { EngagementModule } from '../../shared-modules/engagement/index.js';
import { SlidingWindowRateLimiter } from '../../shared-modules/rate-limit/index.js';
import { AnalyticsController } from './analytics.controller.js';
import { AnalyticsService } from './analytics.service.js';

@Module({
  imports: [EngagementModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, SlidingWindowRateLimiter],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
