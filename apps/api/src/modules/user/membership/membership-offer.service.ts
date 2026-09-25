import { Inject, Injectable } from '@nestjs/common';
import { ORPCError } from '@orpc/server';
import {
  normalizeCountryCode,
  type MembershipCurrency,
  type MembershipCurrentSubscription,
  type MembershipOffer,
  type MembershipOfferedPlan,
} from '@product/contract';
import type { PrismaClient, Subscription as DbSubscription } from '@product/db';
import {
  type AuthenticatedUser,
  requireUser,
} from '../../../shared/types/authenticated-user.js';
import {
  paymentMethodsForOffer,
  pickPlanPrice,
} from '../../../shared/membership/membership-pricing.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { EntitlementService } from '../../shared-modules/subscriptions/entitlement.service.js';

@Injectable()
export class MembershipOfferService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly entitlements: EntitlementService,
  ) {}

  async getOffer(
    currentUser: AuthenticatedUser | null | undefined,
  ): Promise<MembershipOffer> {
    const user = requireUser(currentUser);

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: { countryCode: true, membershipActive: true },
    });

    const countryCode = normalizeCountryCode(profile?.countryCode ?? '');
    const plans = await this.prisma.membershipPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { prices: true, products: true },
    });

    const offered: Array<MembershipOfferedPlan & { marketKey: string }> = [];

    for (const plan of plans) {
      if (plan.prices.length === 0) {
        continue;
      }

      const price = pickPlanPrice(
        plan.prices.map((row) => ({
          marketKey: row.marketKey,
          currency: row.currency as MembershipCurrency,
          amountMinor: row.amountMinor,
        })),
        countryCode,
      );

      offered.push({
        planId: plan.id,
        slug: plan.slug,
        name: plan.name,
        tagline: plan.tagline,
        features: plan.features,
        interval: plan.interval,
        headline: plan.headline,
        ctaLabel: plan.ctaLabel,
        currency: price.currency,
        amountMinor: price.amountMinor,
        appleProductId: appleProductIdFor(plan.products),
        marketKey: price.marketKey,
      });
    }

    const defaultPlan = offered[0];
    if (!defaultPlan) {
      throw new ORPCError('NOT_FOUND', {
        message: 'No membership plan is available yet',
      });
    }

    const currentSubscription = this.toCurrentSubscription(
      await this.entitlements.findCurrentSubscription(user.id),
    );
    const hasMembership =
      (profile?.membershipActive ?? false) || currentSubscription !== null;
    const methodSource =
      plans.find((plan) => plan.prices.length > 0)?.paymentMethodIds ?? [];
    const { marketKey, ...defaultOffer } = defaultPlan;

    return {
      ...defaultOffer,
      countryCode,
      marketKey,
      paymentMethods: paymentMethodsForOffer(methodSource, countryCode),
      hasMembership,
      currentSubscription,
      plans: offered.map(toOfferedPlan),
      appleProductId: defaultPlan.appleProductId,
    };
  }

  private toCurrentSubscription(
    row: DbSubscription | null,
  ): MembershipCurrentSubscription | null {
    if (!row) {
      return null;
    }

    const currency = row.currency === 'USD' ? 'USD' : 'NGN';

    return {
      id: row.id,
      planId: row.planId,
      interval: row.interval,
      provider: row.provider,
      status: row.status,
      autoRenewing: row.autoRenewing,
      currentPeriodEndsAt: row.currentPeriodEndsAt.toISOString(),
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
      currency,
      amountMinor: row.amountMinor,
    };
  }
}

function toOfferedPlan(
  plan: MembershipOfferedPlan & { marketKey: string },
): MembershipOfferedPlan {
  return {
    planId: plan.planId,
    slug: plan.slug,
    name: plan.name,
    tagline: plan.tagline,
    features: plan.features,
    interval: plan.interval,
    headline: plan.headline,
    ctaLabel: plan.ctaLabel,
    currency: plan.currency,
    amountMinor: plan.amountMinor,
    appleProductId: plan.appleProductId,
  };
}

function appleProductIdFor(
  products: Array<{ provider: string; providerProductId: string; marketKey: string }>,
): string | null {
  const apple = products.filter((product) => product.provider === 'apple');
  return (
    apple.find((product) => product.marketKey === '*')?.providerProductId ??
    apple[0]?.providerProductId ??
    null
  );
}
