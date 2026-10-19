import * as SecureStore from 'expo-secure-store';

const PENDING_MATCH_TOKEN_KEY = 'pending_match_token';

export async function stashPendingMatchToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(PENDING_MATCH_TOKEN_KEY, token);
}

/** Read without clearing — used to decide challenge-first onboarding. */
export async function peekPendingMatchToken(): Promise<string | null> {
  return SecureStore.getItemAsync(PENDING_MATCH_TOKEN_KEY);
}

export async function takePendingMatchToken(): Promise<string | null> {
  const token = await SecureStore.getItemAsync(PENDING_MATCH_TOKEN_KEY);
  if (!token) {
    return null;
  }

  await SecureStore.deleteItemAsync(PENDING_MATCH_TOKEN_KEY);
  return token;
}

export async function clearPendingMatchToken(): Promise<void> {
  await SecureStore.deleteItemAsync(PENDING_MATCH_TOKEN_KEY);
}
