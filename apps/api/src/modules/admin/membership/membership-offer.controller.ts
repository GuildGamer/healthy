import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { Public } from '@thallesp/nestjs-better-auth';
import { appContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { MembershipOfferService } from './membership-offer.service.js';

@Controller()
@Public()
export class MembershipOfferController {
  constructor(private readonly offers: MembershipOfferService) {}

  @Implement(appContract.getMembershipOffer)
  getMembershipOffer(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.getMembershipOffer).handler(async () => {
      return this.offers.getOffer(user);
    });
  }
}
