-- CreateEnum
CREATE TYPE "HealthCategory" AS ENUM ('hypertension', 'diabetes', 'asthma', 'general');

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN "healthCategories" "HealthCategory"[] DEFAULT ARRAY[]::"HealthCategory"[];
