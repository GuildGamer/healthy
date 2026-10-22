import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { Public } from '@thallesp/nestjs-better-auth';
import { appContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { ProgressService } from './progress.service.js';

@Controller()
@Public()
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Implement(appContract.listProgressDays)
  listProgressDays(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.listProgressDays).handler(async () => {
      return this.progressService.days(user);
    });
  }

  @Implement(appContract.getProgressDay)
  getProgressDay(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.getProgressDay).handler(async ({ input }) => {
      return this.progressService.day(user, input.dayKey);
    });
  }
}
