import { Inject, Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@product/db';
import { PRISMA } from '../database/prisma.tokens.js';
import { isEntitlementActive } from '../../../shared/membership/period.js';

type DbClient = PrismaClient | Prisma.TransactionClient;

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

    const profile = await client.userProfile.findUnique({
      where: { userId },
      select: { membershipActive: true },
    });

    return profile?.membershipActive ?? false;
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

  async syncMembershipCache(
    userId: string,
    now: Date = new Date(),
    client: DbClient = this.prisma,
  ): Promise<boolean> {
    const membershipActive = await this.hasActiveEntitlement(
      userId,
      now,
      client,
    );

    await client.userProfile.upsert({
      where: { userId },
      create: { userId, membershipActive },
      update: { membershipActive },
    });

    return membershipActive;
  }
}
