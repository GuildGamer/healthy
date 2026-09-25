import type {
  MembershipCurrency,
  MembershipInterval,
  SubscriptionProvider,
} from '@product/contract';
import type { Prisma } from '@product/db';

export type ProviderEventInput = {
  provider: SubscriptionProvider;
  providerEventId: string;
  eventType: string;
  payload: Prisma.InputJsonValue;
};

export type ApplyPurchaseInput = {
  userId: string;
  planId: string;
  membershipProductId?: string | null;
  provider: SubscriptionProvider;
  providerSubscriptionId: string;
  providerProductId: string;
  interval: MembershipInterval;
  currency: MembershipCurrency;
  amountMinor: number;
  startedAt: Date;
  currentPeriodEndsAt: Date;
  autoRenewing?: boolean;
  event: ProviderEventInput;
};

export type ApplyRenewalInput = {
  provider: SubscriptionProvider;
  providerSubscriptionId: string;
  paidThroughAt?: Date;
  event: ProviderEventInput;
};

export type ApplyCancellationInput = {
  provider: SubscriptionProvider;
  providerSubscriptionId: string;
  cancelledAt?: Date;
  event: ProviderEventInput;
};

export type ApplyExpirationInput = {
  provider: SubscriptionProvider;
  providerSubscriptionId: string;
  expiredAt?: Date;
  event: ProviderEventInput;
};

export type ApplyRevocationInput = {
  provider: SubscriptionProvider;
  providerSubscriptionId: string;
  revokedAt?: Date;
  event: ProviderEventInput;
};

export type ApplyRenewalFailureInput = {
  provider: SubscriptionProvider;
  providerSubscriptionId: string;
  graceEndsAt?: Date;
  event: ProviderEventInput;
};

export type AppliedSubscription = {
  id: string;
  userId: string;
  planId: string;
  provider: SubscriptionProvider;
  providerSubscriptionId: string;
  status: string;
  autoRenewing: boolean;
  currentPeriodEndsAt: Date;
};
