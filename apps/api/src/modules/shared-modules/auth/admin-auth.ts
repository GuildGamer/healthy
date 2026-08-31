import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '@product/db';
import { readEnvironment } from '../config/environment.js';

const baseURL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
const secret =
  process.env.BETTER_AUTH_SECRET ?? 'dev-only-change-me-before-production';
const environment = readEnvironment();
const adminAppUrl = environment.adminAppUrl;

/**
 * Operator identity. Own tables, cookie prefix, and path so a member
 * session can never satisfy an admin route.
 */
export const adminAuth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  secret,
  baseURL,
  basePath: '/admin/auth',
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
  },
  user: {
    modelName: 'adminUser',
    additionalFields: {
      isActive: {
        type: 'boolean',
        required: false,
        defaultValue: true,
        input: false,
      },
    },
  },
  session: {
    modelName: 'adminSession',
    cookieCache: {
      enabled: true,
    },
  },
  account: {
    modelName: 'adminAccount',
  },
  verification: {
    modelName: 'adminVerification',
  },
  advanced: {
    cookiePrefix: 'admin',
  },
  trustedOrigins: [
    adminAppUrl,
    'http://localhost:3000',
    'http://localhost:3001',
  ],
});

export type AdminAuth = typeof adminAuth;
