-- AlterEnum
ALTER TYPE "AdminAuditAction" ADD VALUE 'staging_tester_upsert';
ALTER TYPE "AdminAuditAction" ADD VALUE 'staging_tester_toggle';
ALTER TYPE "AdminAuditAction" ADD VALUE 'staging_tester_delete';

-- CreateTable
CREATE TABLE "staging_tester_grants" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdByAdminUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staging_tester_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staging_tester_grants_email_key" ON "staging_tester_grants"("email");

-- CreateIndex
CREATE INDEX "staging_tester_grants_enabled_idx" ON "staging_tester_grants"("enabled");

-- AddForeignKey
ALTER TABLE "staging_tester_grants" ADD CONSTRAINT "staging_tester_grants_createdByAdminUserId_fkey" FOREIGN KEY ("createdByAdminUserId") REFERENCES "admin_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
