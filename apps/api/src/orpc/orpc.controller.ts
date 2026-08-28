import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { Public } from '@thallesp/nestjs-better-auth';
import { appContract } from '@product/contract';
import { ChallengesService } from '../challenges/challenges.service.js';
import type { AuthenticatedUser } from '../me/me.service.js';
import { HealthService } from '../health/health.service.js';
import { MeService } from '../me/me.service.js';
import { WaitlistService } from '../waitlist/waitlist.service.js';

type RequestWithAuth = {
  user?: AuthenticatedUser | null;
};

@Controller()
@Public()
export class OrpcController {
  constructor(
    private readonly healthService: HealthService,
    private readonly meService: MeService,
    private readonly challengesService: ChallengesService,
    private readonly waitlistService: WaitlistService,
  ) {}

  @Implement(appContract.health)
  health() {
    return implement(appContract.health).handler(() => {
      return this.healthService.getContractHealth();
    });
  }

  @Implement(appContract.me)
  me(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.me).handler(async () => {
      return this.meService.getMe(user);
    });
  }

  @Implement(appContract.updateCategories)
  updateCategories(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.updateCategories).handler(async ({ input }) => {
      return this.meService.updateCategories(user, input.categories);
    });
  }

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
      return this.challengesService.complete(user, input.userChallengeId);
    });
  }

  @Implement(appContract.listActivity)
  listActivity(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.listActivity).handler(async () => {
      return this.challengesService.listActivity(user);
    });
  }

  @Implement(appContract.waitlist)
  waitlist() {
    return implement(appContract.waitlist).handler(async ({ input }) => {
      return this.waitlistService.join(input.email, input.source);
    });
  }
}
