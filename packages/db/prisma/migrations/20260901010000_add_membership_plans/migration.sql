-- Membership plans (subscription offers) with per-market prices in minor units.
CREATE TYPE "MembershipInterval" AS ENUM ('month', 'year');

CREATE TABLE "membership_plans" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "features" TEXT[],
    "interval" "MembershipInterval" NOT NULL DEFAULT 'month',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "headline" TEXT,
    "ctaLabel" TEXT,
    "paymentMethodIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "membership_plans_slug_key" ON "membership_plans"("slug");
CREATE INDEX "membership_plans_isActive_sortOrder_idx" ON "membership_plans"("isActive", "sortOrder");

CREATE TABLE "membership_plan_prices" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "marketKey" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_plan_prices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "membership_plan_prices_planId_marketKey_key" ON "membership_plan_prices"("planId", "marketKey");
CREATE INDEX "membership_plan_prices_marketKey_idx" ON "membership_plan_prices"("marketKey");

ALTER TABLE "membership_plan_prices" ADD CONSTRAINT "membership_plan_prices_planId_fkey" FOREIGN KEY ("planId") REFERENCES "membership_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
