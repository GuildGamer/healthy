import { Inject, Injectable } from '@nestjs/common';
import { ORPCError } from '@orpc/server';
import type {
  MembershipPlan,
  UpdateMembershipPlanInput,
  UpsertMembershipPlanInput,
} from '@product/contract';
import type {
  MembershipPlan as DbPlan,
  MembershipPlanPrice as DbPrice,
  PrismaClient,
} from '@product/db';
import {
  type AuthenticatedAdmin,
  requireAdminPermission,
} from '../../../shared/types/authenticated-admin.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';

type PlanWithPrices = DbPlan & { prices: DbPrice[] };

@Injectable()
export class AdminMembershipService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async list(
    currentAdmin: AuthenticatedAdmin | null | undefined,
  ): Promise<{ items: MembershipPlan[] }> {
    requireAdminPermission(currentAdmin, 'content');

    const rows = await this.prisma.membershipPlan.findMany({
      include: { prices: { orderBy: { marketKey: 'asc' } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    const livePlanIds = await this.livePlanIds(rows.map((row) => row.id));

    return {
      items: rows.map((row) => this.toDto(row, livePlanIds.has(row.id))),
    };
  }

  async create(
    currentAdmin: AuthenticatedAdmin | null | undefined,
    input: UpsertMembershipPlanInput,
  ): Promise<{ plan: MembershipPlan }> {
    requireAdminPermission(currentAdmin, 'content');
    await this.assertSlugAvailable(input.slug);
    this.assertPrices(input);

    const created = await this.prisma.membershipPlan.create({
      data: {
        slug: input.slug,
        name: input.name,
        tagline: input.tagline,
        features: input.features,
        interval: input.interval,
        isActive: input.isActive,
        sortOrder: input.sortOrder,
        headline: input.headline,
        ctaLabel: input.ctaLabel,
        paymentMethodIds: input.paymentMethodIds,
        prices: {
          create: input.prices.map((price) => ({
            marketKey: price.marketKey,
            currency: price.currency,
            amountMinor: price.amountMinor,
          })),
        },
      },
      include: { prices: { orderBy: { marketKey: 'asc' } } },
    });

    return { plan: this.toDto(created, false) };
  }

  async update(
    currentAdmin: AuthenticatedAdmin | null | undefined,
    input: UpdateMembershipPlanInput,
  ): Promise<{ plan: MembershipPlan }> {
    requireAdminPermission(currentAdmin, 'content');

    const current = await this.prisma.membershipPlan.findUnique({
      where: { id: input.id },
      select: { id: true, slug: true, interval: true },
    });

    if (!current) {
      throw new ORPCError('NOT_FOUND', { message: 'Plan not found' });
    }

    const hasLiveBilling = await this.planHasLiveBilling(input.id);
    if (
      hasLiveBilling &&
      (input.slug !== current.slug || input.interval !== current.interval)
    ) {
      throw new ORPCError('BAD_REQUEST', {
        message:
          'Slug and interval cannot change after a plan has live billing',
      });
    }

    await this.assertSlugAvailable(input.slug, input.id);
    this.assertPrices(input);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.membershipPlanPrice.deleteMany({ where: { planId: input.id } });

      return tx.membershipPlan.update({
        where: { id: input.id },
        data: {
          slug: input.slug,
          name: input.name,
          tagline: input.tagline,
          features: input.features,
          interval: input.interval,
          isActive: input.isActive,
          sortOrder: input.sortOrder,
          headline: input.headline,
          ctaLabel: input.ctaLabel,
          paymentMethodIds: input.paymentMethodIds,
          prices: {
            create: input.prices.map((price) => ({
              marketKey: price.marketKey,
              currency: price.currency,
              amountMinor: price.amountMinor,
            })),
          },
        },
        include: { prices: { orderBy: { marketKey: 'asc' } } },
      });
    });

    return { plan: this.toDto(updated, hasLiveBilling) };
  }

  private async planHasLiveBilling(planId: string): Promise<boolean> {
    const live = await this.livePlanIds([planId]);
    return live.has(planId);
  }

  private async livePlanIds(planIds: string[]): Promise<Set<string>> {
    if (planIds.length === 0) {
      return new Set();
    }

    const [liveProducts, billed] = await Promise.all([
      this.prisma.membershipProduct.findMany({
        where: { planId: { in: planIds }, isLive: true },
        select: { planId: true },
      }),
      this.prisma.subscription.findMany({
        where: { planId: { in: planIds } },
        distinct: ['planId'],
        select: { planId: true },
      }),
    ]);

    return new Set(
      [...liveProducts, ...billed].map((row) => row.planId),
    );
  }

  private assertPrices(input: UpsertMembershipPlanInput) {
    const keys = new Set(input.prices.map((price) => price.marketKey));
    if (keys.size !== input.prices.length) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Each market can only have one price',
      });
    }

    for (const price of input.prices) {
      if (price.marketKey === 'NG' && price.currency !== 'NGN') {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Nigeria prices must use NGN',
        });
      }

      if (price.marketKey !== 'NG' && price.currency !== 'USD') {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Non-Nigeria prices must use USD',
        });
      }
    }
  }

  private async assertSlugAvailable(slug: string, exceptId?: string) {
    const existing = await this.prisma.membershipPlan.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existing && existing.id !== exceptId) {
      throw new ORPCError('CONFLICT', { message: 'Slug already in use' });
    }
  }

  private toDto(row: PlanWithPrices, hasLiveBilling: boolean): MembershipPlan {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      tagline: row.tagline,
      features: row.features,
      interval: row.interval,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
      headline: row.headline,
      ctaLabel: row.ctaLabel,
      paymentMethodIds: row.paymentMethodIds.filter(
        (id): id is MembershipPlan['paymentMethodIds'][number] =>
          [
            'apple_pay',
            'google_pay',
            'card',
            'bank_transfer',
            'ussd',
          ].includes(id),
      ),
      prices: row.prices.map((price) => ({
        id: price.id,
        marketKey: price.marketKey,
        currency: price.currency as 'NGN' | 'USD',
        amountMinor: price.amountMinor,
      })),
      hasLiveBilling,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
