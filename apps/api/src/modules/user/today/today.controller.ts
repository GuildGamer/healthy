import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { Public } from '@thallesp/nestjs-better-auth';
import { appContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { TodayService } from './today.service.js';

@Controller()
@Public()
export class TodayController {
  constructor(private readonly todayService: TodayService) {}

  @Implement(appContract.getTodayDetails)
  getTodayDetails(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.getTodayDetails).handler(async () => {
      return this.todayService.details(user);
    });
  }
}
