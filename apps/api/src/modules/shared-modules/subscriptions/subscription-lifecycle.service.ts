import { Inject, Injectable } from '@nestjs/common';
import type {
  EntitlementSource,
  Prisma,
  PrismaClient,
  Subscription as DbSubscription,
  SubscriptionProviderEvent,
} from '@product/db';
import type { Result } from '../../../shared/types/result.js';
import { addMembershipInterval } from '../../../shared/membership/period.js';
import { PRISMA } from '../database/prisma.tokens.js';
import { EntitlementService } from './entitlement.service.js';
import type { SubscriptionLifecycleError } from './errors/subscription-lifecycle.error.js';
import type {
  AppliedSubscription,
  ApplyCancellationInput,
  ApplyExpirationInput,
  ApplyPurchaseInput,
  ApplyRenewalFailureInput,
  ApplyRenewalInput,
  ApplyRevocationInput,
  ProviderEventInput,
} from './types/subscription-lifecycle.js';

type DbClient = PrismaClient | Prisma.TransactionClient;
type LifecycleResult<T> = Result<T, SubscriptionLifecycleError>;

@Injectable()
export class SubscriptionLifecycleService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly entitlements: EntitlementService,
  ) {}

  async applyPurchase(
    input: ApplyPurchaseInput,
  ): Promise<LifecycleResult<AppliedSubscription>> {
    return this.prisma.$transaction((tx) => this.purchaseIn(tx, input));
  }

  async applyRenewal(
    input: ApplyRenewalInput,
  ): Promise<LifecycleResult<AppliedSubscription>> {
    return this.prisma.$transaction((tx) => this.renewIn(tx, input));
  }

  async applyCancellation(
    input: ApplyCancellationInput,
  ): Promise<LifecycleResult<AppliedSubscription>> {
    return this.prisma.$transaction((tx) => this.cancelIn(tx, input));
  }

  async applyExpiration(
    input: ApplyExpirationInput,
  ): Promise<LifecycleResult<AppliedSubscription>> {
    return this.prisma.$transaction((tx) => this.expireIn(tx, input));
  }

  async applyRevocation(
    input: ApplyRevocationInput,
  ): Promise<LifecycleResult<AppliedSubscription>> {
    return this.prisma.$transaction((tx) => this.revokeIn(tx, input));
  }

  async applyRenewalFailure(
    input: ApplyRenewalFailureInput,
  ): Promise<LifecycleResult<AppliedSubscription>> {
    return this.prisma.$transaction((tx) => this.failRenewalIn(tx, input));
  }

  private async purchaseIn(
    tx: DbClient,
    input: ApplyPurchaseInput,
  ): Promise<LifecycleResult<AppliedSubscription>> {
    const existing = await this.findByProvider(
      tx,
      input.provider,
      input.providerSubscriptionId,
    );
    if (existing) {
      await this.rememberEvent(tx, input.event, 'processed');
      return { success: true, data: this.toApplied(existing) };
    }

    if (await this.entitlements.hasActivePremium(input.userId, new Date(), tx)) {
      await this.rememberEvent(tx, input.event, 'ignored');
      return { success: false, error: { code: 'duplicate_subscription' } };
    }

    const plan = await tx.membershipPlan.findUnique({
      where: { id: input.planId },
      select: { id: true },
    });
    if (!plan) {
      await this.rememberEvent(tx, input.event, 'ignored');
      return { success: false, error: { code: 'plan_not_found' } };
    }

    await this.rememberEvent(tx, input.event, 'processed');
    const created = await this.createActiveSubscription(tx, input);
    return { success: true, data: this.toApplied(created) };
  }

  private async createActiveSubscription(
    tx: DbClient,
    input: ApplyPurchaseInput,
  ): Promise<DbSubscription> {
    const subscription = await tx.subscription.create({
      data: {
        userId: input.userId,
        planId: input.planId,
        membershipProductId: input.membershipProductId ?? null,
        provider: input.provider,
        providerSubscriptionId: input.providerSubscriptionId,
        providerProductId: input.providerProductId,
        status: 'active',
        autoRenewing: input.autoRenewing ?? true,
        interval: input.interval,
        currency: input.currency,
        amountMinor: input.amountMinor,
        startedAt: input.startedAt,
        currentPeriodEndsAt: input.currentPeriodEndsAt,
      },
    });

    await tx.entitlement.create({
      data: {
        userId: input.userId,
        kind: 'premium',
        source: input.provider as EntitlementSource,
        subscriptionId: subscription.id,
        startsAt: input.startedAt,
        endsAt: input.currentPeriodEndsAt,
      },
    });

    if (input.membershipProductId) {
      await tx.membershipProduct.update({
        where: { id: input.membershipProductId },
        data: { isLive: true },
      });
    }

    await this.entitlements.syncMembershipCache(input.userId, new Date(), tx);
    return subscription;
  }

  private async renewIn(
    tx: DbClient,
    input: ApplyRenewalInput,
  ): Promise<LifecycleResult<AppliedSubscription>> {
    const seen = await this.seenEventResult(tx, input);
    if (seen) {
      return seen;
    }

    const loaded = await this.requireSubscription(tx, input);
    if (!loaded.success) {
      await this.rememberEvent(tx, input.event, 'ignored');
      return loaded;
    }

    await this.rememberEvent(tx, input.event, 'processed');
    const paidThrough =
      input.paidThroughAt ??
      addMembershipInterval(
        loaded.data.currentPeriodEndsAt,
        loaded.data.interval,
      );
    const nextPeriodEndsAt =
      paidThrough.getTime() > loaded.data.currentPeriodEndsAt.getTime()
        ? paidThrough
        : loaded.data.currentPeriodEndsAt;

    const updated = await tx.subscription.update({
      where: { id: loaded.data.id },
      data: {
        status: 'active',
        autoRenewing: true,
        currentPeriodEndsAt: nextPeriodEndsAt,
        cancelledAt: null,
      },
    });
    await this.syncEntitlementEnd(tx, updated.id, nextPeriodEndsAt);
    await this.entitlements.syncMembershipCache(updated.userId, new Date(), tx);
    return { success: true, data: this.toApplied(updated) };
  }

  private async cancelIn(
    tx: DbClient,
    input: ApplyCancellationInput,
  ): Promise<LifecycleResult<AppliedSubscription>> {
    const seen = await this.seenEventResult(tx, input);
    if (seen) {
      return seen;
    }

    const loaded = await this.requireSubscription(tx, input);
    if (!loaded.success) {
      await this.rememberEvent(tx, input.event, 'ignored');
      return loaded;
    }

    await this.rememberEvent(tx, input.event, 'processed');
    const updated = await tx.subscription.update({
      where: { id: loaded.data.id },
      data: {
        status: 'cancelled',
        autoRenewing: false,
        cancelledAt: input.cancelledAt ?? new Date(),
      },
    });
    await this.entitlements.syncMembershipCache(updated.userId, new Date(), tx);
    return { success: true, data: this.toApplied(updated) };
  }

  private async expireIn(
    tx: DbClient,
    input: ApplyExpirationInput,
  ): Promise<LifecycleResult<AppliedSubscription>> {
    const seen = await this.seenEventResult(tx, input);
    if (seen) {
      return seen;
    }

    const loaded = await this.requireSubscription(tx, input);
    if (!loaded.success) {
      await this.rememberEvent(tx, input.event, 'ignored');
      return loaded;
    }

    await this.rememberEvent(tx, input.event, 'processed');
    const expiredAt = input.expiredAt ?? new Date();
    const updated = await tx.subscription.update({
      where: { id: loaded.data.id },
      data: {
        status: 'expired',
        autoRenewing: false,
      },
    });
    await this.syncEntitlementEnd(tx, updated.id, expiredAt);
    await this.entitlements.syncMembershipCache(updated.userId, expiredAt, tx);
    return { success: true, data: this.toApplied(updated) };
  }

  private async revokeIn(
    tx: DbClient,
    input: ApplyRevocationInput,
  ): Promise<LifecycleResult<AppliedSubscription>> {
    const seen = await this.seenEventResult(tx, input);
    if (seen) {
      return seen;
    }

    const loaded = await this.requireSubscription(tx, input);
    if (!loaded.success) {
      await this.rememberEvent(tx, input.event, 'ignored');
      return loaded;
    }

    await this.rememberEvent(tx, input.event, 'processed');
    const revokedAt = input.revokedAt ?? new Date();
    const updated = await tx.subscription.update({
      where: { id: loaded.data.id },
      data: {
        status: 'revoked',
        autoRenewing: false,
        revokedAt,
      },
    });
    await this.syncEntitlementEnd(tx, updated.id, revokedAt);
    await this.entitlements.syncMembershipCache(updated.userId, revokedAt, tx);
    return { success: true, data: this.toApplied(updated) };
  }

  private async failRenewalIn(
    tx: DbClient,
    input: ApplyRenewalFailureInput,
  ): Promise<LifecycleResult<AppliedSubscription>> {
    const seen = await this.seenEventResult(tx, input);
    if (seen) {
      return seen;
    }

    const loaded = await this.requireSubscription(tx, input);
    if (!loaded.success) {
      await this.rememberEvent(tx, input.event, 'ignored');
      return loaded;
    }

    await this.rememberEvent(tx, input.event, 'processed');
    const now = new Date();
    const inGrace =
      input.graceEndsAt !== undefined && input.graceEndsAt.getTime() > now.getTime();
    const updated = await tx.subscription.update({
      where: { id: loaded.data.id },
      data: {
        status: inGrace ? 'grace_period' : 'billing_retry',
      },
    });

    if (inGrace && input.graceEndsAt) {
      await this.syncEntitlementEnd(tx, updated.id, input.graceEndsAt);
    }

    await this.entitlements.syncMembershipCache(updated.userId, now, tx);
    return { success: true, data: this.toApplied(updated) };
  }

  private async requireSubscription(
    tx: DbClient,
    input: {
      provider: ApplyPurchaseInput['provider'];
      providerSubscriptionId: string;
    },
  ): Promise<LifecycleResult<DbSubscription>> {
    const existing = await this.findByProvider(
      tx,
      input.provider,
      input.providerSubscriptionId,
    );
    if (!existing) {
      return { success: false, error: { code: 'subscription_not_found' } };
    }

    return { success: true, data: existing };
  }

  private findByProvider(
    tx: DbClient,
    provider: ApplyPurchaseInput['provider'],
    providerSubscriptionId: string,
  ): Promise<DbSubscription | null> {
    return tx.subscription.findUnique({
      where: {
        provider_providerSubscriptionId: {
          provider,
          providerSubscriptionId,
        },
      },
    });
  }

  private async syncEntitlementEnd(
    tx: DbClient,
    subscriptionId: string,
    endsAt: Date,
  ): Promise<void> {
    await tx.entitlement.updateMany({
      where: { subscriptionId, kind: 'premium' },
      data: { endsAt },
    });
  }

  private async seenEventResult(
    tx: DbClient,
    input: {
      provider: ApplyPurchaseInput['provider'];
      providerSubscriptionId: string;
      event: ProviderEventInput;
    },
  ): Promise<LifecycleResult<AppliedSubscription> | null> {
    const existingEvent = await this.findEvent(tx, input.event);
    if (!existingEvent) {
      return null;
    }

    const existing = await this.findByProvider(
      tx,
      input.provider,
      input.providerSubscriptionId,
    );
    if (existing) {
      return { success: true, data: this.toApplied(existing) };
    }

    return { success: false, error: { code: 'subscription_not_found' } };
  }

  private async rememberEvent(
    tx: DbClient,
    event: ProviderEventInput,
    processingStatus: 'processed' | 'ignored',
  ): Promise<boolean> {
    const existing = await this.findEvent(tx, event);
    if (existing) {
      return false;
    }

    try {
      await tx.subscriptionProviderEvent.create({
        data: {
          provider: event.provider,
          providerEventId: event.providerEventId,
          eventType: event.eventType,
          payload: event.payload,
          processingStatus,
          processedAt: new Date(),
        },
      });
      return true;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return false;
      }

      throw error;
    }
  }

  private findEvent(
    tx: DbClient,
    event: ProviderEventInput,
  ): Promise<SubscriptionProviderEvent | null> {
    return tx.subscriptionProviderEvent.findUnique({
      where: {
        provider_providerEventId: {
          provider: event.provider,
          providerEventId: event.providerEventId,
        },
      },
    });
  }

  private toApplied(row: DbSubscription): AppliedSubscription {
    return {
      id: row.id,
      userId: row.userId,
      planId: row.planId,
      provider: row.provider,
      providerSubscriptionId: row.providerSubscriptionId,
      status: row.status,
      autoRenewing: row.autoRenewing,
      currentPeriodEndsAt: row.currentPeriodEndsAt,
    };
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}
