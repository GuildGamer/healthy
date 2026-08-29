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

/**
 * Session cookie for `@product/client`. Kept as a thin surface so the email-OTP
 * plugin's inferred types do not leak out of this module.
 */
export const authClient = {
  getCookie: () => client.getCookie(),
};

export type AuthActionResult = {
  error: { message?: string } | null;
};

function asActionResult(result: { error?: { message?: string } | null }): AuthActionResult {
  return { error: result.error ?? null };
}

export async function updateUser(input: { name: string }): Promise<AuthActionResult> {
  return asActionResult(await client.updateUser(input));
}

export async function requestPasswordResetEmail(
  email: string,
): Promise<AuthActionResult> {
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
