import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { Public } from '@thallesp/nestjs-better-auth';
import { appContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { NotificationsService } from './notifications.service.js';

@Controller()
@Public()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Implement(appContract.listNotifications)
  listNotifications(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.listNotifications).handler(async () => {
      return this.notificationsService.listInbox(user);
    });
  }

  @Implement(appContract.markNotificationsRead)
  markNotificationsRead(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.markNotificationsRead).handler(async () => {
      return this.notificationsService.markAllRead(user);
    });
  }
}
