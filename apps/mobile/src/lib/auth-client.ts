import { expoClient } from '@better-auth/expo/client';
import { emailOTPClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from './config';

const client = createAuthClient({
  baseURL: API_BASE_URL,
  plugins: [
    expoClient({
      scheme: 'healthy',
      storagePrefix: 'product',
      storage: SecureStore,
    }),
    emailOTPClient(),
  ],
});

export const { signIn, signUp, signOut, useSession } = client;

/** Resolves once the session atom matches the cookie written by sign-in. */
export async function waitForSession(): Promise<boolean> {
  const result = await client.getSession();
  return result.data != null;
}

export async function getSessionData() {
  const result = await client.getSession();
  return result.data;
}

/**
 * Session cookie for `@product/client`. Kept as a thin surface so the email-OTP
 * plugin's inferred types do not leak out of this module.
 */
export const authClient = {
  getCookie: () => client.getCookie(),
};

/** `code` is Better Auth's stable error code, such as `OTP_EXPIRED`. */
export type AuthActionResult = {
  error: { message?: string; code?: string } | null;
};

function asActionResult(result: {
  error?: { message?: string; code?: string } | null;
}): AuthActionResult {
  if (!result.error) {
    return { error: null };
  }

  return { error: { message: result.error.message, code: result.error.code } };
}

export async function updateUser(input: {
  name?: string;
  image?: string | null;
}): Promise<AuthActionResult> {
  const result = asActionResult(await client.updateUser(input));
  if (!result.error) {
    await client.getSession();
  }

  return result;
}

export async function requestEmailChange(newEmail: string): Promise<AuthActionResult> {
  return asActionResult(await client.emailOtp.requestEmailChange({ newEmail }));
}

export async function confirmEmailChange(input: {
  newEmail: string;
  otp: string;
}): Promise<AuthActionResult> {
  const result = asActionResult(await client.emailOtp.changeEmail(input));
  if (!result.error) {
    await client.getSession();
  }

  return result;
}

export async function requestPasswordResetEmail(email: string): Promise<AuthActionResult> {
  return asActionResult(await client.forgetPassword.emailOtp({ email }));
}

export async function checkPasswordResetOtp(input: {
  email: string;
  otp: string;
}): Promise<AuthActionResult> {
  return asActionResult(
    await client.emailOtp.checkVerificationOtp({
      email: input.email,
      otp: input.otp,
      type: 'forget-password',
    }),
  );
}

export async function resetPasswordWithOtp(input: {
  email: string;
  otp: string;
  password: string;
}): Promise<AuthActionResult> {
  return asActionResult(await client.emailOtp.resetPassword(input));
}

export async function signInWithGoogle(): Promise<AuthActionResult> {
  return asActionResult(
    await client.signIn.social({
      provider: 'google',
      callbackURL: '/',
    }),
  );
}

export async function sendSignupVerificationOtp(email: string): Promise<AuthActionResult> {
  return asActionResult(
    await client.emailOtp.sendVerificationOtp({
      email,
      type: 'email-verification',
    }),
  );
}

export async function verifySignupEmail(input: {
  email: string;
  otp: string;
}): Promise<AuthActionResult> {
  const result = asActionResult(await client.emailOtp.verifyEmail(input));
  if (!result.error) {
    await client.getSession();
  }

  return result;
}

export function isEmailVerified(
  session: { user: { emailVerified?: boolean } } | null | undefined,
): boolean {
  return session?.user.emailVerified === true;
}

export async function readEmailVerified(): Promise<boolean> {
  const result = await client.getSession();
  return isEmailVerified(result.data);
}

/** Better Auth's id for an email-and-password sign-in, beside `google` or `apple`. */
const PASSWORD_PROVIDER_ID = 'credential';

/** False for an account that only ever signed in with Google or Apple. */
export async function hasPasswordSignIn(): Promise<boolean> {
  const result = await client.listAccounts();
  if (result.error) {
    throw new Error('Linked sign-in methods could not be read.');
  }

  return result.data.some((account) => account.providerId === PASSWORD_PROVIDER_ID);
}

/** Other phones stay signed in; this one keeps its session. */
export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<AuthActionResult> {
  return asActionResult(await client.changePassword({ ...input, revokeOtherSessions: false }));
}
