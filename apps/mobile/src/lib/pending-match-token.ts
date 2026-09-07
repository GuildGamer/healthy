import * as SecureStore from 'expo-secure-store';

const PENDING_MATCH_TOKEN_KEY = 'pending_match_token';

export async function stashPendingMatchToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(PENDING_MATCH_TOKEN_KEY, token);
}

export async function takePendingMatchToken(): Promise<string | null> {
  const token = await SecureStore.getItemAsync(PENDING_MATCH_TOKEN_KEY);
  if (!token) {
    return null;
  }

  await SecureStore.deleteItemAsync(PENDING_MATCH_TOKEN_KEY);
  return token;
}
