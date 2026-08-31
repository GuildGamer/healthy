import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { emailOTP } from 'better-auth/plugins';
import { prisma } from '@product/db';
import { readEnvironment } from '../config/environment.js';
import { createMailer } from '../mail/index.js';
import { localDevOtp } from './password-reset-otp.js';

const baseURL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
const secret = process.env.BETTER_AUTH_SECRET ?? 'dev-only-change-me-before-production';
const environment = readEnvironment();
const mailer = createMailer(environment.mail);
const pinnedOtp = localDevOtp(environment.isLocal);

/** Empty / `0` placeholders keep boot working until Google credentials are set. */
function readGoogleCredential(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === '0') {
    return '';
  }
  return trimmed;
}

const googleClientId = readGoogleCredential(process.env.GOOGLE_CLIENT_ID);
const googleClientSecret = readGoogleCredential(process.env.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  secret,
  baseURL,
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await prisma.userProfile.upsert({
            where: { userId: user.id },
            create: { userId: user.id },
            update: {},
          });
        },
      },
    },
  },
  plugins: [
    expo(),
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      disableSignUp: true,
      sendVerificationOnSignUp: false,
      changeEmail: { enabled: true },
      ...(pinnedOtp ? { generateOTP: () => pinnedOtp } : {}),
      async sendVerificationOTP({ email, otp, type }) {
        // Fire-and-forget so the response time does not leak whether the
        // address is registered. Delivery errors stay on the server.
        if (type === 'forget-password') {
          void mailer.sendPasswordResetOtp({ to: email, otp });
          return;
        }

        if (type === 'email-verification') {
          void mailer.sendEmailVerificationOtp({ to: email, otp });
          return;
        }

        if (type === 'change-email') {
          void mailer.sendChangeEmailOtp({ to: email, otp });
        }
      },
    }),
  ],
  trustedOrigins: [
    'http://localhost:3000',
    'http://localhost:8081',
    'http://localhost:4321',
    'healthy://',
    'exp://*',
  ],
});

export type Auth = typeof auth;
