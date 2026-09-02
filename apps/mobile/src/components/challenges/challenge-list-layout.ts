import type { TodayChallenge } from '@product/client';

/** Free-tier cap for “today’s win” — members may finish every enrollment. */
export const DAILY_WIN_TARGET = 2;

function resolveDailyWinTarget(
  totalCount: number,
  hasMembership: boolean,
): number {
  if (totalCount === 0) {
    return 0;
  }

  if (hasMembership) {
    return totalCount;
  }

  return Math.min(DAILY_WIN_TARGET, totalCount);
}

/** Peers shown under the focus card before “also available”. */
export const UP_NEXT_LIMIT = 2;

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
export function sortOpenChallengesByFocus(
  challenges: readonly TodayChallenge[],
): TodayChallenge[] {
  return [...challenges].sort((left, right) => {
    const leftStatus = FOCUS_STATUS_RANK[left.status] ?? 9;
    const rightStatus = FOCUS_STATUS_RANK[right.status] ?? 9;
    if (leftStatus !== rightStatus) {
      return leftStatus - rightStatus;
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

export type ChallengeFocusLayout = {
  focus: TodayChallenge | null;
  upNext: TodayChallenge[];
  /** Remaining daily opens beyond focus + up next. */
  alsoAvailable: TodayChallenge[];
  weekly: TodayChallenge[];
  monthly: TodayChallenge[];
  done: TodayChallenge[];
  win: TodayWin;
  /** True when Challenges has more than Home’s focus + up next. */
  hasMoreBeyondPreview: boolean;
};

/**
 * One decision on first paint: focus + short up-next, with week/month and
 * extras parked for progressive disclosure.
 */
export function buildChallengeFocusLayout(
  challenges: readonly TodayChallenge[],
  hasMembership = false,
): ChallengeFocusLayout {
  const done = challenges.filter((item) => item.status === 'completed');
  const open = challenges.filter((item) => item.status !== 'completed');
  const win = buildTodayWin(done.length, challenges.length, hasMembership);

  const focus = open.length === 0 ? null : sortOpenChallengesByFocus(open)[0]!;
  const remaining = focus
    ? open.filter((item) => item.id !== focus.id)
    : [];
  const remainingSorted = sortOpenChallengesByFocus(remaining);
  const upNext = remainingSorted.slice(0, UP_NEXT_LIMIT);
  const upNextIds = new Set(upNext.map((item) => item.id));

  const parked = remainingSorted.slice(UP_NEXT_LIMIT);
  const alsoAvailable = parked.filter((item) => item.frequency === 'daily');
  const weeklyCollapsed = open.filter(
    (item) =>
      item.frequency === 'weekly' &&
      item.id !== focus?.id &&
      !upNextIds.has(item.id),
  );
  const monthlyCollapsed = open.filter(
    (item) =>
      item.frequency === 'monthly' &&
      item.id !== focus?.id &&
      !upNextIds.has(item.id),
  );

  return {
    focus,
    upNext,
    alsoAvailable,
    weekly: sortOpenChallengesByFocus(weeklyCollapsed),
    monthly: sortOpenChallengesByFocus(monthlyCollapsed),
    done,
    win,
    hasMoreBeyondPreview:
      alsoAvailable.length > 0 ||
      weeklyCollapsed.length > 0 ||
      monthlyCollapsed.length > 0 ||
      done.length > 0 ||
      remainingSorted.length > UP_NEXT_LIMIT,
  };
}
