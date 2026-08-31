import { Module } from '@nestjs/common';
import { AdminMembershipController } from './admin-membership.controller.js';
import { AdminMembershipService } from './admin-membership.service.js';
import { MembershipOfferService } from './membership-offer.service.js';
import { MembershipOfferController } from './membership-offer.controller.js';

@Module({
  controllers: [AdminMembershipController, MembershipOfferController],
  providers: [AdminMembershipService, MembershipOfferService],
  exports: [MembershipOfferService],
})
export class AdminMembershipModule {}
