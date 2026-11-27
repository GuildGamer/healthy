import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/client.js';

export * from './generated/client.js';

declare global {
  // eslint-disable-next-line no-var
  var __productPrisma: PrismaClient | undefined;
}

export function createPrismaClient(databaseUrl?: string): PrismaClient {
  const connectionString = databaseUrl ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to create a Prisma client');
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

/**
 * The app's one shared client, created on first use. Importing this package
 * for types or `Prisma.DbNull` must never need a database.
 */
export function getPrisma(): PrismaClient {
  globalThis.__productPrisma ??= createPrismaClient();
  return globalThis.__productPrisma;
}
