-- Idempotent log for week / month / year recap emails.
CREATE TABLE "period_recap_deliveries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "period_recap_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "period_recap_deliveries_userId_period_periodKey_key" ON "period_recap_deliveries"("userId", "period", "periodKey");
CREATE INDEX "period_recap_deliveries_period_periodKey_idx" ON "period_recap_deliveries"("period", "periodKey");

ALTER TABLE "period_recap_deliveries" ADD CONSTRAINT "period_recap_deliveries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
