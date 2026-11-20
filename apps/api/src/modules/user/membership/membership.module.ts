import { Module } from '@nestjs/common';
import { AppleModule } from '../../shared-modules/apple/index.js';
import { SubscriptionsModule } from '../../shared-modules/subscriptions/index.js';
import { MembershipOfferController } from './membership-offer.controller.js';
import { MembershipOfferService } from './membership-offer.service.js';

@Module({
  imports: [SubscriptionsModule, AppleModule],
  controllers: [MembershipOfferController],
  providers: [MembershipOfferService],
})
export class MembershipModule {}
