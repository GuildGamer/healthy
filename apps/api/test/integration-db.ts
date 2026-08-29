import { createPrismaClient, type PrismaClient } from '@product/db';

/**
 * Integration tests run against a sibling of the development database, so they
 * reuse whatever credentials already work locally without ever touching real
 * development rows.
 */
export function testDatabaseUrl(): string {
  const developmentUrl = process.env.DATABASE_URL;
  if (!developmentUrl) {
    throw new Error('DATABASE_URL is required to derive the test database URL');
  }

  const url = new URL(developmentUrl);
  const databaseName = url.pathname.replace(/^\//, '');
  if (!databaseName) {
    throw new Error('DATABASE_URL must include a database name');
  }

  url.pathname = `/${databaseName}_test`;
  return url.toString();
}

export function createTestPrismaClient(): PrismaClient {
  return createPrismaClient(testDatabaseUrl());
}

/** Order matters: children before parents, since these are hard FK links. */
const TABLES_IN_DELETE_ORDER = [
  'notifications',
  'reminder_deliveries',
  'challenge_reminders',
  'push_devices',
  'point_ledger_entries',
  'user_challenges',
  'challenge_enrollments',
  'challenges',
  'user_profiles',
  'user',
] as const;

export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES_IN_DELETE_ORDER.map((table) => `"${table}"`).join(
      ', ',
    )} RESTART IDENTITY CASCADE`,
  );
}
