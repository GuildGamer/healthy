import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { Public } from '@thallesp/nestjs-better-auth';
import { appContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { EnrollmentsService } from './enrollments.service.js';

@Controller()
@Public()
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Implement(appContract.listChallengeCatalog)
  listChallengeCatalog(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.listChallengeCatalog).handler(async () => {
      return this.enrollmentsService.listCatalog(user);
    });
  }

  /** Deliberately anonymous: the first screen previews a day before sign-up. */
  @Implement(appContract.listStarterChallenges)
  listStarterChallenges() {
    return implement(appContract.listStarterChallenges).handler(async () => {
      return this.enrollmentsService.listStarterChallenges();
    });
  }

  @Implement(appContract.setChallengeEnrollment)
  setChallengeEnrollment(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.setChallengeEnrollment).handler(async ({ input }) => {
      return this.enrollmentsService.setEnrollment(
        user,
        input.challengeId,
        input.isEnrolled,
        input.frequency,
        {
          targetCount: input.targetCount,
          targetDurationMinutes: input.targetDurationMinutes,
        },
      );
    });
  }
}
