import { Inject, Injectable } from '@nestjs/common';
import { ORPCError } from '@orpc/server';
import {
  normalizeCountryCode,
  type MembershipOffer,
} from '@product/contract';
import type { PrismaClient } from '@product/db';
import {
  type AuthenticatedUser,
  requireUser,
} from '../../../shared/types/authenticated-user.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import {
  paymentMethodsForOffer,
  pickPlanPrice,
} from './membership-pricing.js';

@Injectable()
export class MembershipOfferService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async getOffer(
    currentUser: AuthenticatedUser | null | undefined,
  ): Promise<MembershipOffer> {
    const user = requireUser(currentUser);

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: { countryCode: true, membershipActive: true },
    });

    const countryCode = normalizeCountryCode(profile?.countryCode ?? '');

    const plan = await this.prisma.membershipPlan.findFirst({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { prices: true },
    });

    if (!plan || plan.prices.length === 0) {
      throw new ORPCError('NOT_FOUND', {
        message: 'No membership plan is available yet',
      });
    }

    const price = pickPlanPrice(
      plan.prices.map((row) => ({
        marketKey: row.marketKey,
        currency: row.currency as 'NGN' | 'USD',
        amountMinor: row.amountMinor,
      })),
      countryCode,
    );

    return {
      planId: plan.id,
      slug: plan.slug,
      name: plan.name,
      tagline: plan.tagline,
      features: plan.features,
      interval: plan.interval,
      headline: plan.headline,
      ctaLabel: plan.ctaLabel,
      countryCode,
      marketKey: price.marketKey,
      currency: price.currency,
      amountMinor: price.amountMinor,
      paymentMethods: paymentMethodsForOffer(
        plan.paymentMethodIds,
        countryCode,
      ),
      hasMembership: profile?.membershipActive ?? false,
    };
  }
}
