export type LeadChallengeCandidate = {
  challengeId: string;
  captureKind: string;
  rewardPoints: number;
  /** Completions in the last ~30 days that fell in the current local hour. */
  completionsInLocalHour: number;
};

const LOW_EFFORT_CAPTURE = new Set(['self_report', 'structured_log']);

function effortRank(captureKind: string): number {
  return LOW_EFFORT_CAPTURE.has(captureKind) ? 0 : 1;
}

/**
 * Pick one open challenge to lead a batched habit push.
 * 1. Most completions in this local hour
 * 2. Lowest effort (self_report / structured_log, then lower points)
 * 3. Stable challenge id
 */
export function pickLeadChallenge(
  candidates: readonly LeadChallengeCandidate[],
): string | null {
  if (candidates.length === 0) {
    return null;
  }

  if (candidates.length === 1) {
    return candidates[0]?.challengeId ?? null;
  }

  const withHourlyHistory = candidates.filter(
    (item) => item.completionsInLocalHour > 0,
  );
  if (withHourlyHistory.length > 0) {
    return [...withHourlyHistory].sort(compareByHourThenEffortThenId)[0]
      ?.challengeId ?? null;
  }

  return [...candidates].sort(compareByEffortThenId)[0]?.challengeId ?? null;
}

function compareByHourThenEffortThenId(
  left: LeadChallengeCandidate,
  right: LeadChallengeCandidate,
): number {
  if (right.completionsInLocalHour !== left.completionsInLocalHour) {
    return right.completionsInLocalHour - left.completionsInLocalHour;
  }

  return compareByEffortThenId(left, right);
}

function compareByEffortThenId(
  left: LeadChallengeCandidate,
  right: LeadChallengeCandidate,
): number {
  const effortDelta = effortRank(left.captureKind) - effortRank(right.captureKind);
  if (effortDelta !== 0) {
    return effortDelta;
  }

  if (left.rewardPoints !== right.rewardPoints) {
    return left.rewardPoints - right.rewardPoints;
  }

  return left.challengeId.localeCompare(right.challengeId);
}

/** Body suffix when several challenges are still open. */
export function moreOpenSuffix(openCount: number): string {
  if (openCount <= 1) {
    return '';
  }

  return ` (+${openCount - 1} more)`;
}
