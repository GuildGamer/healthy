import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { Public } from '@thallesp/nestjs-better-auth';
import { ORPCError } from '@orpc/server';
import { appContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { requireUser } from '../../../shared/types/authenticated-user.js';
import { ApplePurchaseService } from '../../shared-modules/apple/apple-purchase.service.js';
import type { ApplePurchaseError } from '../../shared-modules/apple/errors/apple-purchase.error.js';
import { MembershipOfferService } from './membership-offer.service.js';

@Controller()
@Public()
export class MembershipOfferController {
  constructor(
    private readonly offers: MembershipOfferService,
    private readonly applePurchases: ApplePurchaseService,
  ) {}

  @Implement(appContract.getMembershipOffer)
  getMembershipOffer(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.getMembershipOffer).handler(async () => {
      return this.offers.getOffer(user);
    });
  }

  @Implement(appContract.syncApplePurchase)
  syncApplePurchase(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.syncApplePurchase).handler(async ({ input }) => {
      const signedIn = requireUser(user);
      const result = await this.applePurchases.syncForUser(
        signedIn.id,
        input.signedTransactionInfo,
      );
      if (!result.success) {
        throw toOrpcError(result.error);
      }

      return {
        hasMembership: result.data.hasMembership,
        currentPeriodEndsAt:
          result.data.currentPeriodEndsAt?.toISOString() ?? null,
      };
    });
  }
}

function toOrpcError(error: ApplePurchaseError) {
  if (error.code === 'apple_disabled') {
    return new ORPCError('SERVICE_UNAVAILABLE', { message: error.message });
  }

  if (
    error.code === 'duplicate_subscription' ||
    error.code === 'subscription_linked_to_other_user'
  ) {
    return new ORPCError('CONFLICT', { message: error.message });
  }

  if (error.code === 'product_not_configured') {
    return new ORPCError('NOT_FOUND', { message: error.message });
  }

  return new ORPCError('BAD_REQUEST', { message: error.message });
}
