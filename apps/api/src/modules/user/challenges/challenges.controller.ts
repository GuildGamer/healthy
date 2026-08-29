import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { Public } from '@thallesp/nestjs-better-auth';
import { appContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { ChallengesService } from './challenges.service.js';

@Controller()
@Public()
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Implement(appContract.listTodayChallenges)
  listTodayChallenges(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.listTodayChallenges).handler(async () => {
      return this.challengesService.listToday(user);
    });
  }

  @Implement(appContract.startChallenge)
  startChallenge(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.startChallenge).handler(async ({ input }) => {
      return this.challengesService.start(user, input.userChallengeId);
    });
  }

  @Implement(appContract.completeChallenge)
  completeChallenge(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.completeChallenge).handler(async ({ input }) => {
      return this.challengesService.complete(
        user,
        input.userChallengeId,
        input.vitals,
      );
    });
  }

  @Implement(appContract.listActivity)
  listActivity(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.listActivity).handler(async () => {
      return this.challengesService.listActivity(user);
    });
  }
}
