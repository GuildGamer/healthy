import { Inject, Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@product/db';
import { isEntitlementActive } from '../../../shared/membership/period.js';
import { resolveMembershipActive } from '../../../shared/membership/resolve-membership-active.js';
import { isReviewerMembershipEmail } from '../../../shared/membership/reviewer-membership.js';
import { PRISMA } from '../database/prisma.tokens.js';

type DbClient = PrismaClient | Prisma.TransactionClient;

const REVIEWER_GRANT_REASON = 'Store reviewer permanent access';

@Injectable()
export class EntitlementService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async hasActivePremium(
    userId: string,
    now: Date = new Date(),
    client: DbClient = this.prisma,
  ): Promise<boolean> {
    if (await this.hasActiveEntitlement(userId, now, client)) {
      return true;
    }

    const user = await client.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    return resolveMembershipActive(client, userId, user?.email);
  }

  async hasActiveEntitlement(
    userId: string,
    now: Date = new Date(),
    client: DbClient = this.prisma,
  ): Promise<boolean> {
    const entitlement = await client.entitlement.findFirst({
      where: {
        userId,
        kind: 'premium',
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      select: { endsAt: true },
    });

    if (!entitlement) {
      return false;
    }

    return isEntitlementActive(entitlement.endsAt, now);
  }

  async findCurrentSubscription(
    userId: string,
    now: Date = new Date(),
    client: DbClient = this.prisma,
  ) {
    return client.subscription.findFirst({
      where: {
        userId,
        OR: [
          {
            status: { in: ['active', 'grace_period', 'billing_retry'] },
          },
          {
            status: 'cancelled',
            currentPeriodEndsAt: { gt: now },
          },
        ],
      },
      orderBy: { currentPeriodEndsAt: 'desc' },
    });
  }

  /**
   * Persist an open-ended admin grant for store reviewers and refresh the
   * profile cache so membership survives billing sync.
   */
  async ensureReviewerGrant(userId: string, email: string): Promise<void> {
    if (!isReviewerMembershipEmail(email)) {
      return;
    }

    const existing = await this.prisma.entitlement.findFirst({
      where: {
        userId,
        kind: 'premium',
        source: 'admin_grant',
        endsAt: null,
      },
      select: { id: true },
    });

    if (!existing) {
      await this.prisma.entitlement.create({
        data: {
          userId,
          kind: 'premium',
          source: 'admin_grant',
          startsAt: new Date(),
          endsAt: null,
          grantReason: REVIEWER_GRANT_REASON,
        },
      });
    }

    await this.syncMembershipCache(userId);
  }

  async syncMembershipCache(
    userId: string,
    now: Date = new Date(),
    client: DbClient = this.prisma,
  ): Promise<boolean> {
    const entitled = await this.hasActiveEntitlement(userId, now, client);

    let membershipActive = entitled;

    if (!membershipActive) {
      const profile = await client.userProfile.findUnique({
        where: { userId },
        select: { user: { select: { email: true } } },
      });

      membershipActive = isReviewerMembershipEmail(profile?.user?.email);
    }

    await client.userProfile.upsert({
      where: { userId },
      create: { userId, membershipActive },
      update: { membershipActive },
    });

    return membershipActive;
  }
}
