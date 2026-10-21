import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { adminContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { AdminAuth } from '../../shared-modules/auth/admin.decorators.js';
import { AdminNotificationsService } from './admin-notifications.service.js';

@Controller()
@AdminAuth('support')
export class AdminNotificationsController {
  constructor(private readonly notifications: AdminNotificationsService) {}

  @Implement(adminContract.sendNotification)
  sendNotification(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.sendNotification).handler(async ({ input }) => {
      return this.notifications.send(admin, input);
    });
  }
}
