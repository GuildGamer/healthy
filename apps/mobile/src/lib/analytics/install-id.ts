import * as SecureStore from 'expo-secure-store';

const INSTALL_ID_KEY = 'analytics_install_id';

function createInstallId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `install_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/** Stable per-install id, sent as anonymousId for pre-auth stitching. */
export async function getAnalyticsInstallId(): Promise<string> {
  try {
    const existing = await SecureStore.getItemAsync(INSTALL_ID_KEY);
    if (existing) {
      return existing;
    }

    const created = createInstallId();
    await SecureStore.setItemAsync(INSTALL_ID_KEY, created);
    return created;
  } catch {
    return createInstallId();
  }
}
