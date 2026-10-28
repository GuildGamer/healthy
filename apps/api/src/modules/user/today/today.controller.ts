import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { Public } from '@thallesp/nestjs-better-auth';
import { appContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { ChallengesService } from '../challenges/challenges.service.js';
import { MeService } from '../me/me.service.js';
import { TodayService } from './today.service.js';

@Controller()
@Public()
export class TodayController {
  constructor(
    private readonly todayService: TodayService,
    private readonly challengesService: ChallengesService,
    private readonly meService: MeService,
  ) {}

  @Implement(appContract.getTodayDetails)
  getTodayDetails(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.getTodayDetails).handler(async () => {
      return this.todayService.details(user);
    });
  }

  /**
   * Today's critical path in one auth: profile, due list (materialises), then
   * card details. Me runs in parallel with the list.
   */
  @Implement(appContract.getHomeBootstrap)
  getHomeBootstrap(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.getHomeBootstrap).handler(async () => {
      const mePromise = this.meService.getMe(user);
      const today = await this.challengesService.listToday(user);
      const [me, details] = await Promise.all([mePromise, this.todayService.details(user)]);
      return { me, today, details };
    });
  }
}
