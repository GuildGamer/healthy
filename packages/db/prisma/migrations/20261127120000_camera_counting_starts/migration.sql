-- Lifetime free camera-counting starts for non-members (solo, practice, match).
CREATE TABLE "camera_counting_starts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientStartId" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "userChallengeId" TEXT,
    "challengeId" TEXT,
    "matchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "camera_counting_starts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "camera_counting_starts_userId_clientStartId_key" ON "camera_counting_starts"("userId", "clientStartId");

CREATE INDEX "camera_counting_starts_userId_idx" ON "camera_counting_starts"("userId");

ALTER TABLE "camera_counting_starts" ADD CONSTRAINT "camera_counting_starts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
