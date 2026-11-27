import type { TodayChallenge } from '@product/client';
import { compareChallengeSortOrder } from '@product/contract/challenge-sort';

/** Free-tier cap for “today’s win” — members may finish every enrollment. */
export const DAILY_WIN_TARGET = 2;

function resolveDailyWinTarget(totalCount: number, hasMembership: boolean): number {
  if (totalCount === 0) {
    return 0;
  }

  if (hasMembership) {
    return totalCount;
  }

  return Math.min(DAILY_WIN_TARGET, totalCount);
}

const FOCUS_STATUS_RANK: Record<string, number> = {
  awaiting_evidence: 0,
  in_progress: 1,
  pending: 2,
};

const FREQUENCY_RANK: Record<string, number> = {
  daily: 0,
  weekly: 1,
  monthly: 2,
};

/**
 * Lower = easier to start. Prefer these as focus when nothing is underway so
 * the goal-gradient can form before harder captures.
 */
function easeRank(challenge: TodayChallenge): number {
  switch (challenge.capture.kind) {
    case 'self_report':
      return 0;
    case 'structured_log':
      return 1;
    case 'device_sample':
      return 2;
    case 'photo':
      return 3;
    case 'device_session':
      return 4;
    default:
      return 5;
  }
}

/** Resume / evidence first, then daily over week/month, then easier captures. */
export function sortOpenChallengesByFocus(challenges: readonly TodayChallenge[]): TodayChallenge[] {
  return [...challenges].sort((left, right) => {
    const leftStatus = FOCUS_STATUS_RANK[left.status] ?? 9;
    const rightStatus = FOCUS_STATUS_RANK[right.status] ?? 9;
    if (leftStatus !== rightStatus) {
      return leftStatus - rightStatus;
    }

    const sortCompare = compareChallengeSortOrder(left, right);
    if (sortCompare !== 0) {
      return sortCompare;
    }

    const leftFrequency = FREQUENCY_RANK[left.frequency] ?? 9;
    const rightFrequency = FREQUENCY_RANK[right.frequency] ?? 9;
    if (leftFrequency !== rightFrequency) {
      return leftFrequency - rightFrequency;
    }

    const leftEase = easeRank(left);
    const rightEase = easeRank(right);
    if (leftEase !== rightEase) {
      return leftEase - rightEase;
    }

    return left.title.localeCompare(right.title);
  });
}

export type TodayWin = {
  filled: number;
  target: number;
  locked: boolean;
  label: string;
  /** Short fragment for Home hero: “1/2 today's win” / “win locked”. */
  heroMetaSuffix: string;
};

export function buildTodayWin(
  completedCount: number,
  totalCount: number,
  hasMembership = false,
): TodayWin {
  if (totalCount === 0) {
    return {
      filled: 0,
      target: 0,
      locked: false,
      label: '',
      heroMetaSuffix: '0 done today',
    };
  }

  const target = resolveDailyWinTarget(totalCount, hasMembership);
  const filled = Math.min(completedCount, target);
  const locked = filled >= target;

  if (locked) {
    return {
      filled,
      target,
      locked: true,
      label: hasMembership ? 'All done today' : 'Win locked',
      heroMetaSuffix: hasMembership ? 'all done today' : 'win locked',
    };
  }

  return {
    filled,
    target,
    locked: false,
    label: `Today's win · ${filled} of ${target}`,
    heroMetaSuffix: `${filled}/${target} today's win`,
  };
}
