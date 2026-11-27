import { Module } from '@nestjs/common';
import { AdminMembershipController } from './admin-membership.controller.js';
import { AdminMembershipService } from './admin-membership.service.js';

@Module({
  controllers: [AdminMembershipController],
  providers: [AdminMembershipService],
})
export class AdminMembershipModule {}
