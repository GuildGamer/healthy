import { Module } from '@nestjs/common';
import { EngagementModule } from '../../shared-modules/engagement/index.js';
import { MailModule } from '../../shared-modules/mail/mail.module.js';
import { AdminNotificationsController } from './admin-notifications.controller.js';
import { AdminNotificationsService } from './admin-notifications.service.js';

@Module({
  imports: [EngagementModule, MailModule],
  controllers: [AdminNotificationsController],
  providers: [AdminNotificationsService],
})
export class AdminNotificationsModule {}
