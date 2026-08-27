import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __productPrisma: PrismaClient | undefined;
}

export function createPrismaClient(databaseUrl?: string): PrismaClient {
  return new PrismaClient({
    datasources: databaseUrl
      ? {
          db: { url: databaseUrl },
        }
      : undefined,
  });
}

export const prisma: PrismaClient =
  globalThis.__productPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__productPrisma = prisma;
}
