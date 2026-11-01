import { File, Paths } from 'expo-file-system';
import { emptyWalkOfferBout, type WalkOfferBout } from '@/lib/walk-offer-bout';
import type { OpenWalkOfferGoal } from '@/lib/walk-offer-goal';
import type { GeoPoint } from '@/lib/geo-session';

/**
 * Persisted offer watch. Lives on the document directory so a background
 * location wake (and a locked phone) can still read and write it — SecureStore
 * cannot while the keychain is locked.
 */
export type WalkOfferSession = {
  goal: OpenWalkOfferGoal;
  bout: WalkOfferBout;
};

const SESSION_FILE_NAME = 'walk-offer-session.json';

function sessionFile(): File {
  return new File(Paths.document, SESSION_FILE_NAME);
}

function isGeoPoint(value: unknown): value is GeoPoint {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const point = value as Record<string, unknown>;
  return (
    typeof point.latitude === 'number' &&
    typeof point.longitude === 'number' &&
    typeof point.recordedAt === 'number'
  );
}

function isBout(value: unknown): value is WalkOfferBout {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const bout = value as Record<string, unknown>;
  if (typeof bout.movingSeconds !== 'number') {
    return false;
  }

  return bout.lastFix === null || isGeoPoint(bout.lastFix);
}

function isGoal(value: unknown): value is OpenWalkOfferGoal {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const goal = value as Record<string, unknown>;
  return (
    typeof goal.challengeId === 'string' &&
    typeof goal.userChallengeId === 'string' &&
    typeof goal.dayKey === 'string' &&
    typeof goal.targetDurationMinutes === 'number' &&
    goal.targetDurationMinutes > 0
  );
}

function parseSession(raw: string): WalkOfferSession | null {
  try {
    const parsed = JSON.parse(raw) as { goal?: unknown; bout?: unknown };
    if (!isGoal(parsed.goal) || !isBout(parsed.bout)) {
      return null;
    }
    return { goal: parsed.goal, bout: parsed.bout };
  } catch {
    return null;
  }
}

export async function readWalkOfferSession(): Promise<WalkOfferSession | null> {
  try {
    const file = sessionFile();
    if (!file.exists) {
      return null;
    }
    return parseSession(await file.text());
  } catch {
    return null;
  }
}

export async function writeWalkOfferSession(session: WalkOfferSession): Promise<void> {
  const file = sessionFile();
  if (!file.exists) {
    file.create({ intermediates: true });
  }
  file.write(JSON.stringify(session));
}

export async function clearWalkOfferSession(): Promise<void> {
  try {
    const file = sessionFile();
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Already gone.
  }
}

/** Seed or refresh the session for a goal, keeping an in-progress bout. */
export async function ensureWalkOfferSession(goal: OpenWalkOfferGoal): Promise<WalkOfferSession> {
  const existing = await readWalkOfferSession();
  if (
    existing &&
    existing.goal.userChallengeId === goal.userChallengeId &&
    existing.goal.dayKey === goal.dayKey
  ) {
    const next = { goal, bout: existing.bout };
    await writeWalkOfferSession(next);
    return next;
  }

  const next = { goal, bout: emptyWalkOfferBout() };
  await writeWalkOfferSession(next);
  return next;
}

/** Local calendar day as YYYY-MM-DD, matching how Today keys a day. */
export function localWalkOfferDayKey(at: Date = new Date()): string {
  const year = at.getFullYear();
  const month = String(at.getMonth() + 1).padStart(2, '0');
  const day = String(at.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
