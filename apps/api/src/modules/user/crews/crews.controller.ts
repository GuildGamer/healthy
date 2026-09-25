import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { Public } from '@thallesp/nestjs-better-auth';
import { appContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { CrewsService } from './crews.service.js';

@Controller()
@Public()
export class CrewsController {
  constructor(private readonly crewsService: CrewsService) {}

  @Implement(appContract.listCrews)
  listCrews(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.listCrews).handler(async () => {
      return this.crewsService.list(user);
    });
  }

  @Implement(appContract.saveCrew)
  saveCrew(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.saveCrew).handler(async ({ input }) => {
      return this.crewsService.save(user, input.matchId);
    });
  }

  @Implement(appContract.renameCrew)
  renameCrew(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.renameCrew).handler(async ({ input }) => {
      return this.crewsService.rename(user, input.crewId, input.name);
    });
  }

  @Implement(appContract.leaveCrew)
  leaveCrew(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.leaveCrew).handler(async ({ input }) => {
      return this.crewsService.leave(user, input.crewId);
    });
  }
}
