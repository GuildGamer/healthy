import type { ChallengeCaptureKind, UserChallengeStatus } from '@product/client';
import { isPoseMetric, type POSE_METRICS } from '@product/contract/match-board';

export const PRACTICE_AGAIN_LABEL = 'Another set';

export const PRACTICE_AGAIN_HINT = 'Starts another set. Counts for practice, not points.';

export const CONTEST_AGAIN_HINT = 'Starts another set toward your group contest.';

type PoseMetric = (typeof POSE_METRICS)[number];

type PracticeCandidate = {
  status: UserChallengeStatus;
  capture?: { kind: ChallengeCaptureKind; metric?: string | null };
};

/**
 * Finishing the daily pose challenge ends the points for that day, not the
 * exercise. A completed pose occurrence keeps offering more sets. When an
 * open group contest scores that exercise, those sets go to the contest
 * instead of practice (see `anotherSetRoute`).
 */
export function practiceMetric(occurrence: PracticeCandidate | null | undefined): PoseMetric | null {
  if (!occurrence || occurrence.status !== 'completed') {
    return null;
  }

  const metric = occurrence.capture?.metric;
  return metric && isPoseMetric(metric) ? metric : null;
}

export function canPracticeAgain(occurrence: PracticeCandidate | null | undefined): boolean {
  return practiceMetric(occurrence) !== null;
}

export function practiceRoute(challengeId: string): `/challenge/${string}/practice` {
  return `/challenge/${challengeId}/practice`;
}

/**
 * Today's further sets after the daily target, shown on the challenge screen.
 * Null on a day with none, so an untouched screen stays quiet rather than
 * reading "0 reps".
 */
export function practiceTallyCopy(
  totals: { todayCount: number; todaySessions: number } | undefined,
): string | null {
  if (!totals || totals.todaySessions === 0) {
    return null;
  }

  const reps = totals.todayCount === 1 ? '1 rep' : `${totals.todayCount} reps`;
  const sets = totals.todaySessions === 1 ? 'set' : 'sets';

  return `${reps} in ${totals.todaySessions} ${sets} today`;
}
