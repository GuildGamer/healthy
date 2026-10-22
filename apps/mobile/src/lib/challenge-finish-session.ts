/** In-memory handoff from a finished act (a sheet, a walk, a set) back to Today's card. */
import type { TodayChallenge } from '@product/client';

export type ChallengeFinishOutcome =
  | { kind: 'checkedIn' }
  | { kind: 'logged'; loggedAt: string }
  | { kind: 'water'; glasses: number }
  | { kind: 'reps'; count: number; durationSeconds: number }
  | { kind: 'walk'; durationSeconds: number; distanceMeters: number | null }
  | { kind: 'photo' }
  | { kind: 'extraSet'; count: number };

export type ChallengeFinish = {
  challenge: TodayChallenge;
  outcome: ChallengeFinishOutcome;
  pointsAwarded: number;
  penaltyApplied: number;
  currentStreakDays: number;
  finishedAt: number;
};

/** Long enough to walk back to Today; short enough that an old finish never reappears. */
export const CHALLENGE_FINISH_MAX_AGE_MS = 60_000;

let pending: ChallengeFinish | null = null;
const listeners = new Set<() => void>();

export function announceChallengeFinish(finish: Omit<ChallengeFinish, 'finishedAt'>): void {
  pending = { ...finish, finishedAt: Date.now() };
  listeners.forEach((listener) => listener());
}

/** Hands over the waiting finish once, or null when there is none or it went stale. */
export function takeChallengeFinish(now: number = Date.now()): ChallengeFinish | null {
  const finish = pending;
  pending = null;

  if (!finish || now - finish.finishedAt > CHALLENGE_FINISH_MAX_AGE_MS) {
    return null;
  }

  return finish;
}

export function subscribeToChallengeFinish(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
