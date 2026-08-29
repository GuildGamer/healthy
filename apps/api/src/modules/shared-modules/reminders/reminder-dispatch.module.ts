import { Module } from '@nestjs/common';
import { PushInfrastructureModule } from '../push/push.module.js';
import { ReminderDispatchController } from './reminder-dispatch.controller.js';
import { ReminderDispatcherService } from './reminder-dispatcher.service.js';
import { ReminderScheduler } from './reminder-scheduler.js';

@Module({
  imports: [PushInfrastructureModule],
  controllers: [ReminderDispatchController],
  providers: [ReminderDispatcherService, ReminderScheduler],
  exports: [ReminderDispatcherService],
})
export class ReminderDispatchModule {}
