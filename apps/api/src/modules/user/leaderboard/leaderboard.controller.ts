import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { Public } from '@thallesp/nestjs-better-auth';
import { appContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { LeaderboardService } from './leaderboard.service.js';

@Controller()
@Public()
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Implement(appContract.listLeaderboard)
  listLeaderboard(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.listLeaderboard).handler(async ({ input }) => {
      return this.leaderboardService.list(user, input);
    });
  }
}
