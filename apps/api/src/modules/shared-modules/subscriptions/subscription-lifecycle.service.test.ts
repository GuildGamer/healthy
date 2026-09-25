import { describe, expect, it } from 'vitest';
import { EntitlementService } from './entitlement.service.js';
import { SubscriptionLifecycleService } from './subscription-lifecycle.service.js';
import type { ApplyPurchaseInput } from './types/subscription-lifecycle.js';

type StoredSubscription = {
  id: string;
  userId: string;
  planId: string;
  membershipProductId: string | null;
  provider: ApplyPurchaseInput['provider'];
  providerSubscriptionId: string;
  providerProductId: string;
  status: string;
  autoRenewing: boolean;
  interval: 'month' | 'year';
  currency: string;
  amountMinor: number;
  startedAt: Date;
  currentPeriodEndsAt: Date;
  cancelledAt: Date | null;
  revokedAt: Date | null;
};

type StoredEntitlement = {
  id: string;
  userId: string;
  kind: 'premium';
  source: string;
  subscriptionId: string | null;
  startsAt: Date;
  endsAt: Date | null;
};

type StoredEvent = {
  provider: string;
  providerEventId: string;
};

function createHarness() {
  const subscriptions: StoredSubscription[] = [];
  const entitlements: StoredEntitlement[] = [];
  const events: StoredEvent[] = [];
  const profiles = new Map<string, { membershipActive: boolean }>();
  let nextId = 1;

  const tables = {
    membershipPlan: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === 'plan-month' ? { id: 'plan-month' } : null,
    },
    membershipProduct: {
      update: async () => ({}),
    },
    subscription: {
      findUnique: async ({
        where,
      }: {
        where: {
          provider_providerSubscriptionId: {
            provider: string;
            providerSubscriptionId: string;
          };
        };
      }) => {
        const key = where.provider_providerSubscriptionId;
        return (
          subscriptions.find(
            (row) =>
              row.provider === key.provider &&
              row.providerSubscriptionId === key.providerSubscriptionId,
          ) ?? null
        );
      },
      create: async ({ data }: { data: StoredSubscription }) => {
        const row = { ...data, id: data.id ?? `sub-${nextId}` };
        nextId += 1;
        subscriptions.push(row);
        return row;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<StoredSubscription>;
      }) => {
        const row = subscriptions.find((item) => item.id === where.id);
        if (!row) {
          throw new Error('missing subscription');
        }
        Object.assign(row, data);
        return row;
      },
    },
    entitlement: {
      findFirst: async ({
        where,
      }: {
        where: { userId: string; OR?: Array<{ endsAt: Date | null | { gt: Date } }> };
      }) => {
        const now = new Date();
        return (
          entitlements.find((row) => {
            if (row.userId !== where.userId) {
              return false;
            }
            if (row.endsAt === null) {
              return true;
            }
            return row.endsAt.getTime() > now.getTime();
          }) ?? null
        );
      },
      create: async ({ data }: { data: StoredEntitlement }) => {
        const row = { ...data, id: data.id ?? `ent-${nextId}` };
        nextId += 1;
        entitlements.push(row);
        return row;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { subscriptionId: string };
        data: { endsAt: Date };
      }) => {
        for (const row of entitlements) {
          if (row.subscriptionId === where.subscriptionId) {
            row.endsAt = data.endsAt;
          }
        }
        return { count: 1 };
      },
    },
    userProfile: {
      findUnique: async ({ where }: { where: { userId: string } }) =>
        profiles.get(where.userId) ?? { membershipActive: false },
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { userId: string };
        create: { userId: string; membershipActive: boolean };
        update: { membershipActive: boolean };
      }) => {
        const next = profiles.get(where.userId) ?? {
          membershipActive: create.membershipActive,
        };
        next.membershipActive = update.membershipActive;
        profiles.set(where.userId, next);
        return next;
      },
    },
    subscriptionProviderEvent: {
      findUnique: async ({
        where,
      }: {
        where: {
          provider_providerEventId: {
            provider: string;
            providerEventId: string;
          };
        };
      }) => {
        const key = where.provider_providerEventId;
        return (
          events.find(
            (row) =>
              row.provider === key.provider &&
              row.providerEventId === key.providerEventId,
          ) ?? null
        );
      },
      create: async ({ data }: { data: StoredEvent }) => {
        events.push(data);
        return data;
      },
    },
  };

  const db = {
    ...tables,
    $transaction: async <T>(fn: (client: typeof tables) => Promise<T>) =>
      fn(tables),
  };

  const entitlementsService = new EntitlementService(db as never);
  const lifecycle = new SubscriptionLifecycleService(
    db as never,
    entitlementsService,
  );

  return { lifecycle, subscriptions, entitlements, events, profiles };
}

function purchaseInput(
  overrides: Partial<ApplyPurchaseInput> = {},
): ApplyPurchaseInput {
  return {
    userId: 'user-1',
    planId: 'plan-month',
    provider: 'apple',
    providerSubscriptionId: 'orig-1',
    providerProductId: 'healthy.premium.month',
    interval: 'month',
    currency: 'NGN',
    amountMinor: 100_000,
    startedAt: new Date('2026-09-16T00:00:00.000Z'),
    currentPeriodEndsAt: new Date('2026-10-16T00:00:00.000Z'),
    event: {
      provider: 'apple',
      providerEventId: 'evt-purchase-1',
      eventType: 'purchase',
      payload: {},
    },
    ...overrides,
  };
}

describe('SubscriptionLifecycleService', () => {
  it('creates a subscription, entitlement, and membership cache on purchase', async () => {
    const { lifecycle, subscriptions, entitlements, profiles } = createHarness();

    const result = await lifecycle.applyPurchase(purchaseInput());

    expect(result.success).toBe(true);
    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0]?.status).toBe('active');
    expect(entitlements[0]?.endsAt?.toISOString()).toBe(
      '2026-10-16T00:00:00.000Z',
    );
    expect(profiles.get('user-1')?.membershipActive).toBe(true);
  });

  it('replays the same provider subscription without creating a second row', async () => {
    const { lifecycle, subscriptions } = createHarness();
    const input = purchaseInput();

    await lifecycle.applyPurchase(input);
    const replay = await lifecycle.applyPurchase({
      ...input,
      event: { ...input.event, providerEventId: 'evt-purchase-replay' },
    });

    expect(replay.success).toBe(true);
    expect(subscriptions).toHaveLength(1);
  });

  it('rejects a second provider while Premium is already active', async () => {
    const { lifecycle, subscriptions } = createHarness();

    await lifecycle.applyPurchase(purchaseInput());
    const duplicate = await lifecycle.applyPurchase(
      purchaseInput({
        provider: 'web',
        providerSubscriptionId: 'paystack-1',
        providerProductId: 'PLN_web_month',
        event: {
          provider: 'web',
          providerEventId: 'evt-web-1',
          eventType: 'purchase',
          payload: {},
        },
      }),
    );

    expect(duplicate).toEqual({
      success: false,
      error: { code: 'duplicate_subscription' },
    });
    expect(subscriptions).toHaveLength(1);
  });

  it('extends the paid-through date on renewal', async () => {
    const { lifecycle, subscriptions, entitlements } = createHarness();
    await lifecycle.applyPurchase(purchaseInput());

    const renewed = await lifecycle.applyRenewal({
      provider: 'apple',
      providerSubscriptionId: 'orig-1',
      paidThroughAt: new Date('2026-11-16T00:00:00.000Z'),
      event: {
        provider: 'apple',
        providerEventId: 'evt-renew-1',
        eventType: 'renewal',
        payload: {},
      },
    });

    expect(renewed.success).toBe(true);
    expect(subscriptions[0]?.currentPeriodEndsAt.toISOString()).toBe(
      '2026-11-16T00:00:00.000Z',
    );
    expect(entitlements[0]?.endsAt?.toISOString()).toBe(
      '2026-11-16T00:00:00.000Z',
    );
  });

  it('does not extend twice when the same renewal event is replayed', async () => {
    const { lifecycle, subscriptions } = createHarness();
    await lifecycle.applyPurchase(purchaseInput());

    const event = {
      provider: 'apple' as const,
      providerEventId: 'evt-renew-dup',
      eventType: 'renewal',
      payload: {},
    };

    await lifecycle.applyRenewal({
      provider: 'apple',
      providerSubscriptionId: 'orig-1',
      event,
    });
    await lifecycle.applyRenewal({
      provider: 'apple',
      providerSubscriptionId: 'orig-1',
      event,
    });

    expect(subscriptions[0]?.currentPeriodEndsAt.toISOString()).toBe(
      '2026-11-16T00:00:00.000Z',
    );
  });

  it('re-enables auto-renew without extending the paid-through date', async () => {
    const { lifecycle, subscriptions } = createHarness();
    await lifecycle.applyPurchase(purchaseInput());
    await lifecycle.applyCancellation({
      provider: 'apple',
      providerSubscriptionId: 'orig-1',
      event: {
        provider: 'apple',
        providerEventId: 'evt-cancel-resume',
        eventType: 'cancel',
        payload: {},
      },
    });

    const resumed = await lifecycle.applyRenewal({
      provider: 'apple',
      providerSubscriptionId: 'orig-1',
      paidThroughAt: new Date('2026-10-16T00:00:00.000Z'),
      event: {
        provider: 'apple',
        providerEventId: 'evt-resume-1',
        eventType: 'auto_renew_enabled',
        payload: {},
      },
    });

    expect(resumed.success).toBe(true);
    expect(subscriptions[0]?.status).toBe('active');
    expect(subscriptions[0]?.autoRenewing).toBe(true);
    expect(subscriptions[0]?.currentPeriodEndsAt.toISOString()).toBe(
      '2026-10-16T00:00:00.000Z',
    );
  });

  it('keeps Premium until period end after cancel', async () => {
    const { lifecycle, subscriptions, profiles } = createHarness();
    await lifecycle.applyPurchase(purchaseInput());

    const cancelled = await lifecycle.applyCancellation({
      provider: 'apple',
      providerSubscriptionId: 'orig-1',
      event: {
        provider: 'apple',
        providerEventId: 'evt-cancel-1',
        eventType: 'cancel',
        payload: {},
      },
    });

    expect(cancelled.success).toBe(true);
    expect(subscriptions[0]?.status).toBe('cancelled');
    expect(subscriptions[0]?.autoRenewing).toBe(false);
    expect(profiles.get('user-1')?.membershipActive).toBe(true);
  });

  it('ends Premium immediately on revoke', async () => {
    const { lifecycle, subscriptions, entitlements, profiles } =
      createHarness();
    await lifecycle.applyPurchase(purchaseInput());

    const revokedAt = new Date('2026-09-20T00:00:00.000Z');
    await lifecycle.applyRevocation({
      provider: 'apple',
      providerSubscriptionId: 'orig-1',
      revokedAt,
      event: {
        provider: 'apple',
        providerEventId: 'evt-revoke-1',
        eventType: 'revoke',
        payload: {},
      },
    });

    expect(subscriptions[0]?.status).toBe('revoked');
    expect(entitlements[0]?.endsAt?.toISOString()).toBe(revokedAt.toISOString());
    expect(profiles.get('user-1')?.membershipActive).toBe(false);
  });
});
