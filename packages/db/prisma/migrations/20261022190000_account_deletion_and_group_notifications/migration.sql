-- Group pushes are on unless the member turns them off.
ALTER TABLE "user_profiles" ADD COLUMN "groupNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Marks an account the member deleted; the row is an anonymous tombstone.
ALTER TABLE "user_profiles" ADD COLUMN "deletedAt" TIMESTAMP(3);
