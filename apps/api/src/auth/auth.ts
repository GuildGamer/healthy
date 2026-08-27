import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '@product/db';

const baseURL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
const secret = process.env.BETTER_AUTH_SECRET ?? 'dev-only-change-me-before-production';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  secret,
  baseURL,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [expo()],
  trustedOrigins: [
    'http://localhost:3000',
    'http://localhost:8081',
    'http://localhost:4321',
    'product://',
    'exp://*',
  ],
});

export type Auth = typeof auth;
