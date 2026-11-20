import { Inject, Injectable } from '@nestjs/common';
import { Type, type JWSTransactionDecodedPayload } from '@apple/app-store-server-library';
import {
  normalizeCountryCode,
  type MembershipCurrency,
} from '@product/contract';
import type { PrismaClient } from '@product/db';
import type { Result } from '../../../shared/types/result.js';
import { PRISMA } from '../database/prisma.tokens.js';
import { EntitlementService } from '../subscriptions/entitlement.service.js';
import { SubscriptionLifecycleService } from '../subscriptions/subscription-lifecycle.service.js';
import { snapshotApplePrice } from './apple-price.js';
import { APPLE_SIGNED_DATA_VERIFIER } from './apple.tokens.js';
import {
  APPLE_PURCHASE_ERROR_MESSAGE,
  type ApplePurchaseError,
} from './errors/apple-purchase.error.js';
import type { AppleSignedDataVerifier } from './types/apple-signed-data.js';

type ApplePurchaseSuccess = {
  hasMembership: boolean;
  currentPeriodEndsAt: Date | null;
};

type ApplePurchaseResult = Result<ApplePurchaseSuccess, ApplePurchaseError>;

@Injectable()
export class ApplePurchaseService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(APPLE_SIGNED_DATA_VERIFIER)
    private readonly verifier: AppleSignedDataVerifier | null,
    private readonly lifecycle: SubscriptionLifecycleService,
    private readonly entitlements: EntitlementService,
  ) {}

  async syncForUser(
    userId: string,
    signedTransactionInfo: string,
  ): Promise<ApplePurchaseResult> {
    if (!this.verifier) {
      return failure('apple_disabled');
    }

    const transaction = await this.decodeTransaction(signedTransactionInfo);
    if (!transaction.success) {
      return transaction;
    }

    const decoded = transaction.data;
    const originalTransactionId = decoded.originalTransactionId?.trim();
    const productId = decoded.productId?.trim();
    const transactionId = decoded.transactionId?.trim();

    if (!originalTransactionId || !productId || !transactionId) {
      return failure('invalid_transaction');
    }

    if (!isAutoRenewableSubscription(decoded.type)) {
      return failure('invalid_transaction');
    }

    if (decoded.revocationDate || !decoded.expiresDate || !decoded.purchaseDate) {
      return failure('transaction_not_active');
    }

    const expiresAt = new Date(decoded.expiresDate);
    if (expiresAt.getTime() <= Date.now()) {
      return failure('transaction_not_active');
    }

    const product = await this.prisma.membershipProduct.findUnique({
      where: {
        provider_providerProductId: {
          provider: 'apple',
          providerProductId: productId,
        },
      },
      include: { plan: { include: { prices: true } } },
    });

    if (!product) {
      return failure('product_not_configured');
    }

    const existing = await this.prisma.subscription.findUnique({
      where: {
        provider_providerSubscriptionId: {
          provider: 'apple',
          providerSubscriptionId: originalTransactionId,
        },
      },
      select: { userId: true },
    });

    if (existing && existing.userId !== userId) {
      return failure('subscription_linked_to_other_user');
    }

    const event = {
      provider: 'apple' as const,
      providerEventId: `txn:${transactionId}`,
      eventType: existing ? 'restore' : 'purchase',
      payload: {
        originalTransactionId,
        productId,
        transactionId,
      },
    };

    if (existing) {
      const renewed = await this.lifecycle.applyRenewal({
        provider: 'apple',
        providerSubscriptionId: originalTransactionId,
        paidThroughAt: expiresAt,
        event,
      });

      if (!renewed.success) {
        return failure('invalid_transaction');
      }

      return { success: true, data: await this.toSuccess(userId) };
    }

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { countryCode: true },
    });
    const price = snapshotApplePrice(
      decoded,
      product.plan.prices.map((row) => ({
        marketKey: row.marketKey,
        currency: row.currency as MembershipCurrency,
        amountMinor: row.amountMinor,
      })),
      normalizeCountryCode(profile?.countryCode ?? ''),
    );

    const purchased = await this.lifecycle.applyPurchase({
      userId,
      planId: product.planId,
      membershipProductId: product.id,
      provider: 'apple',
      providerSubscriptionId: originalTransactionId,
      providerProductId: productId,
      interval: product.plan.interval,
      currency: price.currency,
      amountMinor: price.amountMinor,
      startedAt: new Date(decoded.purchaseDate),
      currentPeriodEndsAt: expiresAt,
      autoRenewing: true,
      event,
    });

    if (!purchased.success) {
      if (purchased.error.code === 'duplicate_subscription') {
        return failure('duplicate_subscription');
      }

      return failure('invalid_transaction');
    }

    return { success: true, data: await this.toSuccess(userId) };
  }

  private async decodeTransaction(
    signedTransactionInfo: string,
  ): Promise<Result<JWSTransactionDecodedPayload, ApplePurchaseError>> {
    if (!this.verifier) {
      return failure('apple_disabled');
    }

    try {
      return {
        success: true,
        data: await this.verifier.verifyTransaction(signedTransactionInfo),
      };
    } catch {
      return failure('invalid_transaction');
    }
  }

  private async toSuccess(userId: string): Promise<ApplePurchaseSuccess> {
    const current = await this.entitlements.findCurrentSubscription(userId);
    const hasMembership = await this.entitlements.hasActivePremium(userId);

    return {
      hasMembership,
      currentPeriodEndsAt: current?.currentPeriodEndsAt ?? null,
    };
  }
}

function failure(code: ApplePurchaseError['code']): {
  success: false;
  error: ApplePurchaseError;
} {
  return {
    success: false,
    error: { code, message: APPLE_PURCHASE_ERROR_MESSAGE[code] },
  };
}

function isAutoRenewableSubscription(
  type: Type | string | undefined,
): boolean {
  return type === undefined || type === Type.AUTO_RENEWABLE_SUBSCRIPTION;
}
