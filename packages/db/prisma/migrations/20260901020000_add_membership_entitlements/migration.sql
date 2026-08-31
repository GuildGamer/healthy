-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN "membershipActive" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "challenges" ADD COLUMN "requiresMembership" BOOLEAN NOT NULL DEFAULT false;
