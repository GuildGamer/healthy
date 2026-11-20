-- When the set finished on the phone. Scoring uses this when present.
ALTER TABLE "match_attempts" ADD COLUMN "performedAt" TIMESTAMP(3);
