import * as SecureStore from 'expo-secure-store';

export type WalkOfferStatus = 'offered' | 'accepted' | 'dismissed';

export type WalkOfferRecord = {
  dayKey: string;
  userChallengeId: string;
  status: WalkOfferStatus;
};

const KEY = 'walk_offer_v1';

export async function readWalkOfferRecord(): Promise<WalkOfferRecord | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as WalkOfferRecord;
    if (
      typeof parsed.dayKey !== 'string' ||
      typeof parsed.userChallengeId !== 'string' ||
      (parsed.status !== 'offered' &&
        parsed.status !== 'accepted' &&
        parsed.status !== 'dismissed')
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function writeWalkOfferRecord(record: WalkOfferRecord): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(record));
}

/** True when this occurrence already got a prompt or answer today. */
export function walkOfferAlreadyHandled(
  record: WalkOfferRecord | null,
  dayKey: string,
  userChallengeId: string,
): boolean {
  if (!record) {
    return false;
  }

  return record.dayKey === dayKey && record.userChallengeId === userChallengeId;
}
