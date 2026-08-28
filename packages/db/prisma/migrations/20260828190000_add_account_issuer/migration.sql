-- Better Auth 1.7+ requires account.issuer (e.g. local:credential for email/password).
-- Backfill any existing rows before enforcing NOT NULL.

ALTER TABLE "account" ADD COLUMN "issuer" TEXT;

UPDATE "account"
SET "issuer" = 'local:credential'
WHERE "issuer" IS NULL AND "providerId" = 'credential';

UPDATE "account"
SET "issuer" = 'local:oauth:' || "providerId"
WHERE "issuer" IS NULL;

ALTER TABLE "account" ALTER COLUMN "issuer" SET NOT NULL;

CREATE UNIQUE INDEX "account_issuer_accountId_key" ON "account"("issuer", "accountId");
