import type { ChallengeCaptureKind, UserChallengeStatus } from '@product/client';

export const PRACTICE_AGAIN_LABEL = 'Push-ups again';

/** Short enough for the 88pt pill on a challenge row. */
export const PRACTICE_AGAIN_SHORT_LABEL = 'Again';

type PracticeCandidate = {
  status: UserChallengeStatus;
  capture?: { kind: ChallengeCaptureKind; metric?: string | null };
};

/**
 * Finishing the daily push-up challenge ends the scoring, not the exercise.
 * A completed push-up occurrence keeps offering free sets, which are recorded
 * as activity but earn no points and no streak.
 */
export function canPracticeAgain(occurrence: PracticeCandidate | null | undefined): boolean {
  if (!occurrence || occurrence.status !== 'completed') {
    return false;
  }

  return occurrence.capture?.metric === 'pushups';
}

export function practiceRoute(challengeId: string): `/challenge/${string}/practice` {
  return `/challenge/${challengeId}/practice`;
}

/**
 * Today's extra sets, shown on the challenge screen. Null on a day with none,
 * so an untouched screen stays quiet rather than reading "0 reps".
 */
export function practiceTallyCopy(
  totals: { todayCount: number; todaySessions: number } | undefined,
): string | null {
  if (!totals || totals.todaySessions === 0) {
    return null;
  }

  const reps = totals.todayCount === 1 ? '1 rep' : `${totals.todayCount} reps`;
  const sets = totals.todaySessions === 1 ? 'set' : 'sets';

  return `${reps} in ${totals.todaySessions} extra ${sets} today`;
}
