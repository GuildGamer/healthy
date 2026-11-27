import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { Public } from '@thallesp/nestjs-better-auth';
import { appContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { PracticeService } from './practice.service.js';

@Controller()
@Public()
export class PracticeController {
  constructor(private readonly practiceService: PracticeService) {}

  @Implement(appContract.recordPracticeSession)
  recordPracticeSession(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.recordPracticeSession).handler(
      async ({ input }) => {
        return this.practiceService.record(user, input);
      },
    );
  }

  @Implement(appContract.getPracticeTotals)
  getPracticeTotals(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.getPracticeTotals).handler(async ({ input }) => {
      return this.practiceService.totals(user, input.metric);
    });
  }
}
