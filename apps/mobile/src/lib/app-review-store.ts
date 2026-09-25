import * as SecureStore from 'expo-secure-store';

export type AppReviewState = {
  lastPromptedAt: string;
  lastPromptDayKey: string | null;
  lastPromptedStreakMilestone: number | null;
};

function storageKey(userId: string): string {
  return `app_review_state_${userId}`;
}

export async function loadAppReviewState(
  userId: string,
): Promise<AppReviewState | null> {
  const raw = await SecureStore.getItemAsync(storageKey(userId));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppReviewState>;
    if (typeof parsed.lastPromptedAt !== 'string') {
      return null;
    }

    return {
      lastPromptedAt: parsed.lastPromptedAt,
      lastPromptDayKey:
        typeof parsed.lastPromptDayKey === 'string'
          ? parsed.lastPromptDayKey
          : null,
      lastPromptedStreakMilestone:
        typeof parsed.lastPromptedStreakMilestone === 'number'
          ? parsed.lastPromptedStreakMilestone
          : null,
    };
  } catch {
    return null;
  }
}

export async function saveAppReviewState(
  userId: string,
  state: AppReviewState,
): Promise<void> {
  await SecureStore.setItemAsync(storageKey(userId), JSON.stringify(state));
}
