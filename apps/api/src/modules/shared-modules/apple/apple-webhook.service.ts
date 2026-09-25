import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@product/db';
import { PRISMA } from '../database/prisma.tokens.js';
import { SubscriptionLifecycleService } from '../subscriptions/subscription-lifecycle.service.js';
import type { ProviderEventInput } from '../subscriptions/types/subscription-lifecycle.js';
import { appleNotificationAction } from './apple-notification-action.js';
import { APPLE_SIGNED_DATA_VERIFIER } from './apple.tokens.js';
import type { AppleSignedDataVerifier } from './types/apple-signed-data.js';

export type AppleWebhookHandleError = 'apple_disabled' | 'invalid_payload';

export type AppleWebhookHandleResult =
  | { success: true }
  | { success: false; error: AppleWebhookHandleError };

@Injectable()
export class AppleWebhookService {
  private readonly logger = new Logger(AppleWebhookService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(APPLE_SIGNED_DATA_VERIFIER)
    private readonly verifier: AppleSignedDataVerifier | null,
    private readonly lifecycle: SubscriptionLifecycleService,
  ) {}

  async handleSignedPayload(
    signedPayload: string,
  ): Promise<AppleWebhookHandleResult> {
    if (!this.verifier) {
      return { success: false, error: 'apple_disabled' };
    }

    try {
      const notification = await this.verifier.verifyNotification(signedPayload);
      const notificationUUID = notification.notificationUUID?.trim();
      if (!notificationUUID) {
        return { success: false, error: 'invalid_payload' };
      }

      const action = appleNotificationAction(
        notification.notificationType,
        notification.subtype,
      );
      const event = providerEvent(
        notificationUUID,
        notification.notificationType ?? 'unknown',
        {
          notificationType: notification.notificationType ?? null,
          subtype: notification.subtype ?? null,
        },
      );

      if (action.kind === 'ignore') {
        await this.rememberIgnored(event);
        return { success: true };
      }

      const signedTransactionInfo = notification.data?.signedTransactionInfo;
      const transaction = signedTransactionInfo
        ? await this.verifier.verifyTransaction(signedTransactionInfo)
        : null;
      const originalTransactionId = transaction?.originalTransactionId?.trim() ?? null;
      if (!originalTransactionId) {
        await this.rememberIgnored(event);
        this.logger.log(
          `Ignored Apple ${notification.notificationType ?? 'unknown'} ${notificationUUID}: no originalTransactionId`,
        );
        return { success: true };
      }

      const expiresAt = transaction?.expiresDate
        ? new Date(transaction.expiresDate)
        : null;
      const graceEndsAt = await this.graceEndsAtFrom(
        notification.data?.signedRenewalInfo,
      );

      await this.applyAction(
        action,
        originalTransactionId,
        event,
        expiresAt,
        graceEndsAt,
      );
      return { success: true };
    } catch {
      return { success: false, error: 'invalid_payload' };
    }
  }

  private async applyAction(
    action: Exclude<ReturnType<typeof appleNotificationAction>, { kind: 'ignore' }>,
    originalTransactionId: string,
    event: ProviderEventInput,
    expiresAt: Date | null,
    graceEndsAt: Date | null,
  ): Promise<void> {
    if (action.kind === 'renew') {
      await this.lifecycle.applyRenewal({
        provider: 'apple',
        providerSubscriptionId: originalTransactionId,
        paidThroughAt: expiresAt ?? undefined,
        event,
      });
      return;
    }

    if (action.kind === 'cancel') {
      await this.lifecycle.applyCancellation({
        provider: 'apple',
        providerSubscriptionId: originalTransactionId,
        event,
      });
      return;
    }

    if (action.kind === 'expire') {
      await this.lifecycle.applyExpiration({
        provider: 'apple',
        providerSubscriptionId: originalTransactionId,
        event,
      });
      return;
    }

    if (action.kind === 'revoke') {
      await this.lifecycle.applyRevocation({
        provider: 'apple',
        providerSubscriptionId: originalTransactionId,
        event,
      });
      return;
    }

    await this.lifecycle.applyRenewalFailure({
      provider: 'apple',
      providerSubscriptionId: originalTransactionId,
      graceEndsAt: action.inGrace ? (graceEndsAt ?? undefined) : undefined,
      event,
    });
  }

  private async graceEndsAtFrom(
    signedRenewalInfo: string | undefined,
  ): Promise<Date | null> {
    if (!signedRenewalInfo || !this.verifier) {
      return null;
    }

    const decoded = await this.verifier.verifyRenewalInfo(signedRenewalInfo);
    return decoded.gracePeriodExpiresDate
      ? new Date(decoded.gracePeriodExpiresDate)
      : null;
  }

  private async rememberIgnored(event: ProviderEventInput): Promise<void> {
    try {
      await this.prisma.subscriptionProviderEvent.create({
        data: {
          provider: event.provider,
          providerEventId: event.providerEventId,
          eventType: event.eventType,
          payload: event.payload,
          processingStatus: 'ignored',
          processedAt: new Date(),
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return;
      }

      throw error;
    }
  }
}

function providerEvent(
  notificationUUID: string,
  eventType: string,
  payload: Prisma.InputJsonValue,
): ProviderEventInput {
  return {
    provider: 'apple',
    providerEventId: notificationUUID,
    eventType,
    payload,
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}
