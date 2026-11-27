-- Link tips to challenges / activities and cite sources for "Why it matters".
ALTER TABLE "tips" ADD COLUMN "challengeSlug" TEXT;
ALTER TABLE "tips" ADD COLUMN "activityKey" TEXT;
ALTER TABLE "tips" ADD COLUMN "source" TEXT;
ALTER TABLE "tips" ADD COLUMN "sourceUrl" TEXT;

CREATE INDEX "tips_challengeSlug_idx" ON "tips"("challengeSlug");
CREATE INDEX "tips_activityKey_idx" ON "tips"("activityKey");
