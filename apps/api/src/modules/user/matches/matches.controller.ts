import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { Public } from '@thallesp/nestjs-better-auth';
import { appContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { MatchesService } from './matches.service.js';

@Controller()
@Public()
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Implement(appContract.createMatch)
  createMatch(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.createMatch).handler(async ({ input }) => {
      return this.matchesService.create(user, input.window);
    });
  }

  @Implement(appContract.listMyMatches)
  listMyMatches(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.listMyMatches).handler(async () => {
      return this.matchesService.listMine(user);
    });
  }

  @Implement(appContract.previewMatch)
  previewMatch(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.previewMatch).handler(async ({ input }) => {
      return this.matchesService.preview(user, input.token);
    });
  }

  @Implement(appContract.joinMatch)
  joinMatch(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.joinMatch).handler(async ({ input }) => {
      return this.matchesService.join(user, input.token);
    });
  }

  @Implement(appContract.getMatch)
  getMatch(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.getMatch).handler(async ({ input }) => {
      return this.matchesService.get(user, input.matchId);
    });
  }

  @Implement(appContract.submitMatchAttempt)
  submitMatchAttempt(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.submitMatchAttempt).handler(async ({ input }) => {
      return this.matchesService.submitAttempt(user, input);
    });
  }

  @Implement(appContract.cancelMatch)
  cancelMatch(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.cancelMatch).handler(async ({ input }) => {
      return this.matchesService.cancel(user, input.matchId);
    });
  }
}
