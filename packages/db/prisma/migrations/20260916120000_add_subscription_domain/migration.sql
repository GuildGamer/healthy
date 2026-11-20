-- Subscription domain: provider SKUs, billing rows, entitlements, webhook events.

CREATE TYPE "SubscriptionProvider" AS ENUM ('apple', 'google', 'web');
CREATE TYPE "SubscriptionStatus" AS ENUM ('pending', 'active', 'grace_period', 'billing_retry', 'cancelled', 'expired', 'revoked');
CREATE TYPE "EntitlementSource" AS ENUM ('apple', 'google', 'web', 'admin_grant');
CREATE TYPE "EntitlementKind" AS ENUM ('premium');
CREATE TYPE "ProviderEventProcessingStatus" AS ENUM ('received', 'processed', 'ignored', 'failed');

CREATE TABLE "membership_products" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "provider" "SubscriptionProvider" NOT NULL,
    "providerProductId" TEXT NOT NULL,
    "marketKey" TEXT NOT NULL DEFAULT '*',
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "membership_products_provider_providerProductId_key" ON "membership_products"("provider", "providerProductId");
CREATE UNIQUE INDEX "membership_products_planId_provider_marketKey_key" ON "membership_products"("planId", "provider", "marketKey");
CREATE INDEX "membership_products_planId_provider_idx" ON "membership_products"("planId", "provider");

ALTER TABLE "membership_products" ADD CONSTRAINT "membership_products_planId_fkey" FOREIGN KEY ("planId") REFERENCES "membership_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "membershipProductId" TEXT,
    "provider" "SubscriptionProvider" NOT NULL,
    "providerSubscriptionId" TEXT NOT NULL,
    "providerProductId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "autoRenewing" BOOLEAN NOT NULL DEFAULT true,
    "interval" "MembershipInterval" NOT NULL,
    "currency" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "currentPeriodEndsAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscriptions_provider_providerSubscriptionId_key" ON "subscriptions"("provider", "providerSubscriptionId");
CREATE INDEX "subscriptions_userId_status_idx" ON "subscriptions"("userId", "status");
CREATE INDEX "subscriptions_currentPeriodEndsAt_status_idx" ON "subscriptions"("currentPeriodEndsAt", "status");
CREATE INDEX "subscriptions_planId_idx" ON "subscriptions"("planId");

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_membershipProductId_fkey" FOREIGN KEY ("membershipProductId") REFERENCES "membership_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "entitlements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "EntitlementKind" NOT NULL DEFAULT 'premium',
    "source" "EntitlementSource" NOT NULL,
    "subscriptionId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "grantedByAdminUserId" TEXT,
    "grantReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entitlements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "entitlements_userId_kind_endsAt_idx" ON "entitlements"("userId", "kind", "endsAt");
CREATE INDEX "entitlements_subscriptionId_idx" ON "entitlements"("subscriptionId");

ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_grantedByAdminUserId_fkey" FOREIGN KEY ("grantedByAdminUserId") REFERENCES "admin_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "subscription_provider_events" (
    "id" TEXT NOT NULL,
    "provider" "SubscriptionProvider" NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "processingStatus" "ProviderEventProcessingStatus" NOT NULL DEFAULT 'received',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_provider_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscription_provider_events_provider_providerEventId_key" ON "subscription_provider_events"("provider", "providerEventId");
CREATE INDEX "subscription_provider_events_processingStatus_receivedAt_idx" ON "subscription_provider_events"("processingStatus", "receivedAt");
