import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { Public } from '@thallesp/nestjs-better-auth';
import { appContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { RemindersService } from './reminders.service.js';

@Controller()
@Public()
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Implement(appContract.addChallengeReminder)
  addChallengeReminder(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.addChallengeReminder).handler(
      async ({ input }) => {
        return this.remindersService.addReminder(
          user,
          input.challengeId,
          input.minuteOfDay,
        );
      },
    );
  }

  @Implement(appContract.removeChallengeReminder)
  removeChallengeReminder(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.removeChallengeReminder).handler(
      async ({ input }) => {
        return this.remindersService.removeReminder(user, input.reminderId);
      },
    );
  }
}
