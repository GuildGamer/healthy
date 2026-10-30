-- AlterTable
ALTER TABLE "analytics_events" ADD COLUMN "sessionId" TEXT,
ADD COLUMN "platform" TEXT,
ADD COLUMN "appVersion" TEXT,
ADD COLUMN "emitter" TEXT;

-- CreateIndex
CREATE INDEX "analytics_events_sessionId_occurredAt_idx" ON "analytics_events"("sessionId", "occurredAt");
