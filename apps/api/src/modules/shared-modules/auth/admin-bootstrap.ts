import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import type { PrismaClient } from '@product/db';
import type { Environment } from '../config/environment.js';

const LOCAL_BOOTSTRAP_EMAIL = 'admin@example.com';
const LOCAL_BOOTSTRAP_PASSWORD = 'admin-dev';

export async function ensureBootstrapSuperadmin(
  prisma: PrismaClient,
  environment: Environment,
): Promise<void> {
  const existing = await prisma.adminRoleAssignment.findFirst({
    where: { role: 'superadmin', adminUser: { isActive: true } },
    select: { id: true },
  });

  if (existing) {
    return;
  }

  const email = environment.adminBootstrapEmail;
  const password = environment.adminBootstrapPassword;

  if (environment.isProd && (!email || !password)) {
    return;
  }

  const bootstrapEmail = email ?? LOCAL_BOOTSTRAP_EMAIL;
  const bootstrapPassword = password ?? LOCAL_BOOTSTRAP_PASSWORD;
  const userId = randomUUID();
  const hashed = await hashPassword(bootstrapPassword);

  await prisma.adminUser.create({
    data: {
      id: userId,
      name: 'Superadmin',
      email: bootstrapEmail,
      emailVerified: true,
      isActive: true,
      accounts: {
        create: {
          id: randomUUID(),
          issuer: 'local:credential',
          accountId: userId,
          providerId: 'credential',
          password: hashed,
        },
      },
      roles: {
        create: { role: 'superadmin' },
      },
    },
  });
}
