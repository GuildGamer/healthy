-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN "deactivatedAt" TIMESTAMP(3);

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('content', 'support', 'superadmin');
CREATE TYPE "AdminAuditAction" AS ENUM (
  'point_credit',
  'point_debit',
  'member_deactivate',
  'member_reactivate',
  'admin_invite',
  'admin_deactivate',
  'admin_reactivate',
  'admin_roles_update'
);

-- CreateTable
CREATE TABLE "tips" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "HealthCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tips_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tips_slug_key" ON "tips"("slug");
CREATE INDEX "tips_isActive_category_sortOrder_idx" ON "tips"("isActive", "category", "sortOrder");

CREATE TABLE "admin_user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_user_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_user_email_key" ON "admin_user"("email");

CREATE TABLE "admin_session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "admin_session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_session_token_key" ON "admin_session"("token");

CREATE TABLE "admin_account" (
    "id" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_account_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_account_issuer_accountId_key" ON "admin_account"("issuer", "accountId");

CREATE TABLE "admin_verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_verification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_role_assignments" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_role_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_role_assignments_adminUserId_role_key" ON "admin_role_assignments"("adminUserId", "role");
CREATE INDEX "admin_role_assignments_role_idx" ON "admin_role_assignments"("role");

CREATE TABLE "admin_audit_events" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "action" "AdminAuditAction" NOT NULL,
    "targetMemberUserId" TEXT,
    "targetAdminUserId" TEXT,
    "reason" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_audit_events_adminUserId_createdAt_idx" ON "admin_audit_events"("adminUserId", "createdAt");
CREATE INDEX "admin_audit_events_targetMemberUserId_createdAt_idx" ON "admin_audit_events"("targetMemberUserId", "createdAt");

ALTER TABLE "admin_session" ADD CONSTRAINT "admin_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "admin_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admin_account" ADD CONSTRAINT "admin_account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "admin_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admin_role_assignments" ADD CONSTRAINT "admin_role_assignments_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admin_audit_events" ADD CONSTRAINT "admin_audit_events_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
