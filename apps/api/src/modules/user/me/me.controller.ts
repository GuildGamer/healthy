import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { Public } from '@thallesp/nestjs-better-auth';
import { appContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { MeService } from './me.service.js';

@Controller()
@Public()
export class MeController {
  constructor(private readonly meService: MeService) {}

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

  @Implement(appContract.updateTimeZone)
  updateTimeZone(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.updateTimeZone).handler(async ({ input }) => {
      return this.meService.updateTimeZone(user, input.timeZone);
    });
  }

  @Implement(appContract.updateCountry)
  updateCountry(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.updateCountry).handler(async ({ input }) => {
      return this.meService.updateCountry(user, input.countryCode);
    });
  }

  @Implement(appContract.updateDisplayName)
  updateDisplayName(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.updateDisplayName).handler(async ({ input }) => {
      return this.meService.updateDisplayName(user, input.displayName);
    });
  }

  @Implement(appContract.updateReminder)
  updateReminder(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.updateReminder).handler(async ({ input }) => {
      return this.meService.updateReminder(
        user,
        input.enabled,
        input.reminderMinute,
      );
    });
  }

  @Implement(appContract.updateHealthLink)
  updateHealthLink(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.updateHealthLink).handler(async ({ input }) => {
      return this.meService.updateHealthLink(user, input.status);
    });
  }

  @Implement(appContract.updateNotificationSettings)
  updateNotificationSettings(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.updateNotificationSettings).handler(
      async ({ input }) => {
        return this.meService.updateNotificationSettings(user, input);
      },
    );
  }
}
