import * as SecureStore from 'expo-secure-store';

/** Only the way in is kept on the phone: never the name or the email. */
export type SignInMethod = 'google' | 'email' | 'apple';

const STORAGE_KEY = 'last_sign_in_method';

function isSignInMethod(value: string): value is SignInMethod {
  return value === 'google' || value === 'email' || value === 'apple';
}

export async function loadLastSignInMethod(): Promise<SignInMethod | null> {
  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEY);
    if (stored && isSignInMethod(stored)) {
      return stored;
    }
  } catch {
    // The hint is optional: unreadable storage shows no tag.
  }

  return null;
}

/** Never rejects: a hint that fails to save must not fail the sign-in it follows. */
export async function saveLastSignInMethod(method: SignInMethod): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, method);
  } catch {
    // Losing the hint only loses the "Last used" tag next time.
  }
}

/** After an account is deleted the phone should not suggest signing back in to it. */
export async function clearLastSignInMethod(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  } catch {
    // Only the "Last used" tag survives, and it points at nothing.
  }
}
