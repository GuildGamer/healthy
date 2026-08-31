import { Module } from '@nestjs/common';
import { AdminWaitlistController } from './admin-waitlist.controller.js';
import { AdminWaitlistService } from './admin-waitlist.service.js';

@Module({
  controllers: [AdminWaitlistController],
  providers: [AdminWaitlistService],
})
export class AdminWaitlistModule {}
