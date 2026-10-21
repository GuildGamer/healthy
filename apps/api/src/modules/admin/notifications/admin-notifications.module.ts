import { Module } from '@nestjs/common';
import { MailModule } from '../../shared-modules/mail/mail.module.js';
import { PushInfrastructureModule } from '../../shared-modules/push/push.module.js';
import { AdminNotificationsController } from './admin-notifications.controller.js';
import { AdminNotificationsService } from './admin-notifications.service.js';

@Module({
  imports: [PushInfrastructureModule, MailModule],
  controllers: [AdminNotificationsController],
  providers: [AdminNotificationsService],
})
export class AdminNotificationsModule {}
