-- CreateEnum
CREATE TYPE "ProofClipAudience" AS ENUM ('anyone', 'only_me');

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN "proofClipAudience" "ProofClipAudience";

-- AlterTable
ALTER TABLE "proof_clips" ADD COLUMN "audience" "ProofClipAudience",
ADD COLUMN "postedToGroupAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "proof_clips_matchId_postedToGroupAt_idx" ON "proof_clips"("matchId", "postedToGroupAt");

-- Backfill: shared → anyone; group → only_me + posted to board.
UPDATE "proof_clips"
SET "audience" = 'anyone'
WHERE "visibility" = 'shared';

UPDATE "proof_clips"
SET "audience" = 'only_me',
    "postedToGroupAt" = COALESCE("sharedAt", "recordedAt", "createdAt")
WHERE "visibility" = 'group';
