import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { adminContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { AdminAuth } from '../../shared-modules/auth/admin.decorators.js';
import { AdminAnalyticsService } from './analytics.service.js';

@Controller()
@AdminAuth('any')
export class AdminAnalyticsController {
  constructor(private readonly analytics: AdminAnalyticsService) {}

  @Implement(adminContract.getOverviewAnalytics)
  getOverviewAnalytics(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.getOverviewAnalytics).handler(
      async ({ input }) => this.analytics.overview(admin, input),
    );
  }

  @Implement(adminContract.getMarketsAnalytics)
  getMarketsAnalytics(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.getMarketsAnalytics).handler(
      async ({ input }) => this.analytics.markets(admin, input),
    );
  }

  @Implement(adminContract.getGrowthAnalytics)
  getGrowthAnalytics(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.getGrowthAnalytics).handler(
      async ({ input }) => this.analytics.growth(admin, input),
    );
  }

  @Implement(adminContract.getEngagementAnalytics)
  getEngagementAnalytics(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.getEngagementAnalytics).handler(
      async ({ input }) => this.analytics.engagement(admin, input),
    );
  }

  @Implement(adminContract.getCatalogAnalytics)
  getCatalogAnalytics(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.getCatalogAnalytics).handler(
      async ({ input }) => this.analytics.catalog(admin, input),
    );
  }

  @Implement(adminContract.getRemindersAnalytics)
  getRemindersAnalytics(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.getRemindersAnalytics).handler(
      async ({ input }) => this.analytics.reminders(admin, input),
    );
  }
}
