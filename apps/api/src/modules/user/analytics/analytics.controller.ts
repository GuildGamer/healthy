import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { Public } from '@thallesp/nestjs-better-auth';
import { appContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { AnalyticsService } from './analytics.service.js';

@Controller()
@Public()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Implement(appContract.trackAnalyticsEvent)
  trackAnalyticsEvent(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.trackAnalyticsEvent).handler(
      async ({ input }) => {
        return this.analyticsService.track(user, input);
      },
    );
  }
}
