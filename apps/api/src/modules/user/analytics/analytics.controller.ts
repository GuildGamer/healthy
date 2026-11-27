import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { Public } from '@thallesp/nestjs-better-auth';
import { appContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { SlidingWindowRateLimiter } from '../../shared-modules/rate-limit/index.js';
import { AnalyticsService } from './analytics.service.js';

/** Soft cap so a noisy client cannot fill the events table. */
const ANALYTICS_RATE_LIMIT = 120;

@Controller()
@Public()
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly rateLimiter: SlidingWindowRateLimiter,
  ) {}

  @Implement(appContract.trackAnalyticsEvent)
  trackAnalyticsEvent(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.trackAnalyticsEvent).handler(
      async ({ input }) => {
        if (!this.allow(request, input.anonymousId)) {
          return { ok: true as const };
        }
        return this.analyticsService.track(user, input);
      },
    );
  }

  @Implement(appContract.trackAnalyticsEventsBatch)
  trackAnalyticsEventsBatch(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.trackAnalyticsEventsBatch).handler(
      async ({ input }) => {
        const anonymousId = input.events.find(
          (event) => event.anonymousId,
        )?.anonymousId;
        if (!this.allow(request, anonymousId)) {
          return { ok: true as const };
        }
        return this.analyticsService.trackBatch(user, input.events);
      },
    );
  }

  private allow(
    request: RequestWithAuth,
    anonymousId: string | undefined,
  ): boolean {
    const key = request.user?.id
      ? `user:${request.user.id}`
      : anonymousId
        ? `anon:${anonymousId}`
        : `ip:${request.ip ?? 'unknown'}`;
    return this.rateLimiter.tryConsume(key, ANALYTICS_RATE_LIMIT);
  }
}
