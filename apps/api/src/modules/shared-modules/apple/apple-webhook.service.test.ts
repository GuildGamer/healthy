import { NotificationTypeV2 } from '@apple/app-store-server-library';
import { describe, expect, it, vi } from 'vitest';
import { AppleWebhookService } from './apple-webhook.service.js';
import { SubscriptionLifecycleService } from '../subscriptions/subscription-lifecycle.service.js';
import type { AppleSignedDataVerifier } from './types/apple-signed-data.js';

function createService(options: {
  verifier?: AppleSignedDataVerifier | null;
  prisma?: {
    subscriptionProviderEvent: {
      create: ReturnType<typeof vi.fn>;
    };
  };
  lifecycle?: Partial<SubscriptionLifecycleService>;
} = {}) {
  const events: Array<{ providerEventId: string; processingStatus: string }> = [];
  const prisma = options.prisma ?? {
    subscriptionProviderEvent: {
      create: vi.fn(async ({ data }: { data: { providerEventId: string; processingStatus: string } }) => {
        events.push(data);
        return data;
      }),
    },
  };

  const lifecycle = {
    applyRenewal: vi.fn().mockResolvedValue({
      success: false,
      error: { code: 'subscription_not_found' },
    }),
    applyCancellation: vi.fn().mockResolvedValue({ success: true, data: {} }),
    applyExpiration: vi.fn().mockResolvedValue({ success: true, data: {} }),
    applyRevocation: vi.fn().mockResolvedValue({ success: true, data: {} }),
    applyRenewalFailure: vi.fn().mockResolvedValue({ success: true, data: {} }),
    ...options.lifecycle,
  };

  const verifier =
    options.verifier === undefined
      ? null
      : options.verifier;

  const service = new AppleWebhookService(
    prisma as never,
    verifier,
    lifecycle as unknown as SubscriptionLifecycleService,
  );

  return { service, lifecycle, prisma, events };
}

const notification = {
  notificationType: NotificationTypeV2.DID_RENEW,
  notificationUUID: 'uuid-1',
  data: { signedTransactionInfo: 'txn-jws' },
};

describe('AppleWebhookService', () => {
  it('returns apple_disabled when Apple IAP is off', async () => {
    const { service } = createService({ verifier: null });

    await expect(service.handleSignedPayload('payload')).resolves.toEqual({
      success: false,
      error: 'apple_disabled',
    });
  });

  it('persists an ignored event when the subscription is not bound yet', async () => {
    const verifier: AppleSignedDataVerifier = {
      verifyNotification: vi.fn().mockResolvedValue(notification),
      verifyTransaction: vi.fn().mockResolvedValue({
        originalTransactionId: 'orig-1',
        expiresDate: Date.now() + 1_000,
      }),
      verifyRenewalInfo: vi.fn(),
    };
    const { service, lifecycle, events } = createService({ verifier });

    const result = await service.handleSignedPayload('signed');

    expect(result).toEqual({ success: true });
    expect(lifecycle.applyRenewal).toHaveBeenCalledWith(
      expect.objectContaining({
        providerSubscriptionId: 'orig-1',
        event: expect.objectContaining({ providerEventId: 'uuid-1' }),
      }),
    );
    expect(events).toHaveLength(0);
  });

  it('is idempotent when the same notification UUID is replayed', async () => {
    const verifier: AppleSignedDataVerifier = {
      verifyNotification: vi.fn().mockResolvedValue({
        notificationType: NotificationTypeV2.TEST,
        notificationUUID: 'uuid-test',
      }),
      verifyTransaction: vi.fn(),
      verifyRenewalInfo: vi.fn(),
    };
    const { service, prisma } = createService({ verifier });

    await service.handleSignedPayload('signed');
    await service.handleSignedPayload('signed');

    expect(prisma.subscriptionProviderEvent.create).toHaveBeenCalledTimes(2);
  });

  it('renews after the Apple subscription is already bound', async () => {
    const verifier: AppleSignedDataVerifier = {
      verifyNotification: vi.fn().mockResolvedValue(notification),
      verifyTransaction: vi.fn().mockResolvedValue({
        originalTransactionId: 'orig-1',
        expiresDate: Date.parse('2026-11-16T00:00:00.000Z'),
      }),
      verifyRenewalInfo: vi.fn(),
    };
    const { service, lifecycle } = createService({
      verifier,
      lifecycle: {
        applyRenewal: vi.fn().mockResolvedValue({
          success: true,
          data: { id: 'sub-1' },
        }),
      },
    });

    await expect(service.handleSignedPayload('signed')).resolves.toEqual({
      success: true,
    });
    expect(lifecycle.applyRenewal).toHaveBeenCalledWith(
      expect.objectContaining({
        paidThroughAt: new Date('2026-11-16T00:00:00.000Z'),
      }),
    );
  });
});
