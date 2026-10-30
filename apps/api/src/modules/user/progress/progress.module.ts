import { Module } from '@nestjs/common';
import { MailModule } from '../../shared-modules/mail/mail.module.js';
import { PeriodRecapDispatcherService } from './period-recap-dispatcher.service.js';
import { PeriodRecapScheduler } from './period-recap-scheduler.js';
import { ProgressController } from './progress.controller.js';
import { ProgressService } from './progress.service.js';

@Module({
  imports: [MailModule],
  controllers: [ProgressController],
  providers: [ProgressService, PeriodRecapDispatcherService, PeriodRecapScheduler],
  exports: [ProgressService],
})
export class ProgressModule {}
