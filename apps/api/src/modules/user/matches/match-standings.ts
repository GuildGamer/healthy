import {
  MATCH_CUMULATIVE_DAILY_CAP_BY_METRIC,
  type MatchMetric,
  type MatchScoringMode,
  type MatchStanding,
} from '@product/contract';

/**
 * One scoring event. A push-up set for the attempt-driven modes, a finished
 * daily occurrence for `days_completed`.
 */
export type StandingEvent = {
  userId: string;
  /** Reps in the set. Ignored by `days_completed`, which counts days. */
  count: number;
  /**
   * Local calendar day the event belongs to, `YYYY-MM-DD`. Attempts use the
   * contest's zone so one daily cap applies to everyone equally; completions
   * use the member's own `periodKey`, because that is the day their challenge
   * actually rolled over in.
   */
  dayKey: string;
  occurredAt: Date;
};

export type StandingParticipant = {
  userId: string;
  displayName: string;
  isHost: boolean;
  /**
   * Seated from a crew, not yet accepted. Holds a seat and appears on the
   * board, but is never scored — being added is not agreeing to play.
   */
  isPending: boolean;
};

export type StandingsResult = {
  standings: Omit<MatchStanding, 'isYou'>[];
  winnerUserId: string | null;
};

/**
 * The two facts that decide how a contest is scored. Kept together so the
 * mode and the metric cannot be passed in the wrong order, and so the daily
 * cap is always read in the unit the score is actually counted in.
 */
export type MatchScoringRules = {
  scoringMode: MatchScoringMode;
  metric: MatchMetric;
};

/**
 * Running total for one member, plus the moment it last went up. Every mode
 * ranks on the same pair, which is what keeps the tie-break honest across
 * contests that are won in completely different ways.
 */
type MemberProgress = {
  score: number;
  arrivedAt: Date | null;
  perDayCounted: Map<string, number>;
  distinctDays: Set<string>;
};

/**
 * Score this member would hold after `event`. Each mode is a pure fold step,
 * so the ordering, tie-break, and ranking below are written once.
 */
function scoreAfter(
  rules: MatchScoringRules,
  progress: MemberProgress,
  event: StandingEvent,
): number {
  if (rules.scoringMode === 'best_single') {
    return Math.max(progress.score, event.count);
  }

  if (rules.scoringMode === 'days_completed') {
    return progress.distinctDays.has(event.dayKey)
      ? progress.score
      : progress.score + 1;
  }

  const dailyCap = MATCH_CUMULATIVE_DAILY_CAP_BY_METRIC[rules.metric];
  const countedToday = progress.perDayCounted.get(event.dayKey) ?? 0;
  const remainingToday = Math.max(0, dailyCap - countedToday);
  return progress.score + Math.min(event.count, remainingToday);
}

function emptyProgress(): MemberProgress {
  return {
    score: 0,
    arrivedAt: null,
    perDayCounted: new Map(),
    distinctDays: new Set(),
  };
}

/**
 * Ranks on score, then on who reached that score first. A member who never
 * scored has no arrival and sorts below everyone who did, however the contest
 * was won.
 */
function compareProgress(
  left: StandingRow,
  right: StandingRow,
): number {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  if (left.arrivedAt && right.arrivedAt) {
    const reached = left.arrivedAt.getTime() - right.arrivedAt.getTime();
    if (reached !== 0) {
      return reached;
    }
  }

  if (left.arrivedAt && !right.arrivedAt) {
    return -1;
  }

  if (!left.arrivedAt && right.arrivedAt) {
    return 1;
  }

  return left.userId.localeCompare(right.userId);
}

type StandingRow = StandingParticipant & {
  score: number;
  arrivedAt: Date | null;
};

function accumulate(
  participants: StandingParticipant[],
  events: StandingEvent[],
  rules: MatchScoringRules,
): StandingRow[] {
  // Pending members get no progress entry, so their events are dropped by the
  // fold below. Enforced here rather than at the call sites: consent is not
  // something a caller should be able to forget.
  const progressByUser = new Map<string, MemberProgress>();
  for (const participant of participants) {
    if (participant.isPending) {
      continue;
    }

    progressByUser.set(participant.userId, emptyProgress());
  }

  // Chronological, so "when did their score reach its final value" falls out of
  // the fold instead of needing a second pass per mode.
  const ordered = [...events].sort(
    (left, right) => left.occurredAt.getTime() - right.occurredAt.getTime(),
  );

  for (const event of ordered) {
    const progress = progressByUser.get(event.userId);
    if (!progress) {
      continue;
    }

    const next = scoreAfter(rules, progress, event);
    if (next > progress.score) {
      progress.score = next;
      progress.arrivedAt = event.occurredAt;
    }

    progress.distinctDays.add(event.dayKey);
    progress.perDayCounted.set(
      event.dayKey,
      (progress.perDayCounted.get(event.dayKey) ?? 0) + event.count,
    );
  }

  return participants.map((participant) => {
    const progress = progressByUser.get(participant.userId) ?? emptyProgress();

    return {
      ...participant,
      score: progress.score,
      arrivedAt: progress.arrivedAt,
    };
  });
}

export function computeStandings(
  participants: StandingParticipant[],
  events: StandingEvent[],
  rules: MatchScoringRules,
): StandingsResult {
  const ordered = accumulate(participants, events, rules).sort(compareProgress);

  const leader = ordered[0];
  const winnerUserId = leader && leader.score > 0 ? leader.userId : null;

  const standings: Omit<MatchStanding, 'isYou'>[] = [];
  let previousScore: number | null = null;
  let rank = 0;

  for (const [index, row] of ordered.entries()) {
    if (previousScore === null || previousScore !== row.score) {
      rank = index + 1;
    }

    standings.push({
      userId: row.userId,
      displayName: row.displayName,
      rank,
      score: row.score,
      // Mirrors `score` for clients that predate scoring modes.
      bestCount: row.score,
      isHost: row.isHost,
      isPending: row.isPending,
    });
    previousScore = row.score;
  }

  return { standings, winnerUserId };
}
