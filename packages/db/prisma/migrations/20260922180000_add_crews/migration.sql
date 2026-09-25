-- Saved rosters, formed retroactively from a finished contest.
CREATE TABLE "crews" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crew_members" (
    "id" TEXT NOT NULL,
    "crewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "crew_members_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "crews_ownerUserId_createdAt_idx" ON "crews"("ownerUserId", "createdAt");

CREATE UNIQUE INDEX "crew_members_crewId_userId_key" ON "crew_members"("crewId", "userId");

CREATE INDEX "crew_members_userId_idx" ON "crew_members"("userId");

ALTER TABLE "crews" ADD CONSTRAINT "crews_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "crew_members" ADD CONSTRAINT "crew_members_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "crews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "crew_members" ADD CONSTRAINT "crew_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Provenance: which roster seated a contest.
ALTER TABLE "matches" ADD COLUMN "crewId" TEXT;

ALTER TABLE "matches" ADD CONSTRAINT "matches_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "crews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seated-pending state. Everyone already in a contest arrived by link, which
-- is an acceptance, so their accepted time is their join time.
ALTER TABLE "match_participants" ADD COLUMN "acceptedAt" TIMESTAMP(3);

UPDATE "match_participants" SET "acceptedAt" = "joinedAt";
