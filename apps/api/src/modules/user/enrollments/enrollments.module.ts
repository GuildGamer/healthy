import { Module } from '@nestjs/common';
import { FriendMilestonesModule } from '../friend-milestones/index.js';
import { RemindersModule } from '../reminders/reminders.module.js';
import { EnrollmentsController } from './enrollments.controller.js';
import { EnrollmentsService } from './enrollments.service.js';

@Module({
  imports: [RemindersModule, FriendMilestonesModule],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
