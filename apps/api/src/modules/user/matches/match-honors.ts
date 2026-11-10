import type { MatchHonor, MatchHonorKind, MatchMetric } from '@product/contract';
import {
  computeStandings,
  type MatchScoringRules,
  type StandingEvent,
  type StandingParticipant,
  type StandingsResult,
} from './match-standings.js';

/** Attempt-shaped input for honors that need duration (fastest set). */
export type HonorAttempt = StandingEvent & {
  durationSeconds: number;
};

export type MatchHonorsInput = {
  participants: StandingParticipant[];
  events: StandingEvent[];
  attempts: HonorAttempt[];
  rules: MatchScoringRules;
  startsAt: Date;
  endsAt: Date;
  acceptedAtByUser: ReadonlyMap<string, Date>;
};

const SIDE_HONOR_MIN_SCORERS = 3;

/** Min reps (or plank seconds-as-count) before a set qualifies as "fastest". */
const FASTEST_MIN_COUNT: Partial<Record<MatchMetric, number>> = {
  pushups: 10,
  squats: 10,
  jumping_jacks: 10,
  burpees: 8,
  sit_ups: 10,
  mountain_climbers: 10,
  lunges: 10,
  plank: 20,
};

/** Priority for past-list / push / carousel primary slide. */
export const HONOR_PRIMARY_ORDER: readonly MatchHonorKind[] = [
  'comeback',
  'photo_finish',
  'fastest_set',
  'best_set',
  'biggest_day',
  'first_score',
  'iron_week',
  'champion',
] as const;

type NameByUser = Map<string, string>;

function midpointAt(startsAt: Date, endsAt: Date): Date {
  return new Date(startsAt.getTime() + (endsAt.getTime() - startsAt.getTime()) / 2);
}

function eventsThrough(events: StandingEvent[], cutoff: Date): StandingEvent[] {
  const at = cutoff.getTime();
  return events.filter((event) => event.occurredAt.getTime() <= at);
}

function scoredUserIds(result: StandingsResult): string[] {
  return result.standings.filter((row) => row.score > 0).map((row) => row.userId);
}

function rankByUser(result: StandingsResult): Map<string, number> {
  const ranks = new Map<string, number>();
  for (const row of result.standings) {
    ranks.set(row.userId, row.rank);
  }
  return ranks;
}

function honor(
  kind: MatchHonorKind,
  userId: string,
  names: NameByUser,
  title: string,
  proof: string,
  shareText: string,
  palette: string,
): MatchHonor {
  return {
    kind,
    userId,
    displayName: names.get(userId) ?? 'Member',
    title,
    proof,
    shareText,
    palette,
  };
}

function championHonor(
  final: StandingsResult,
  names: NameByUser,
  comebackUserId: string | null,
): MatchHonor | null {
  if (!final.winnerUserId) {
    return null;
  }

  const winner = final.standings.find((row) => row.userId === final.winnerUserId);
  if (!winner || winner.score <= 0) {
    return null;
  }

  const isComebackWin = comebackUserId === final.winnerUserId;
  const proof = isComebackWin
    ? `Comeback King · ${winner.score}`
    : `${winner.score}`;

  return honor(
    'champion',
    final.winnerUserId,
    names,
    'You took the crown.',
    proof,
    'I took the crown on Healthy.',
    'champion',
  );
}

function pickBestSet(
  attempts: HonorAttempt[],
  rules: MatchScoringRules,
  names: NameByUser,
): MatchHonor | null {
  if (rules.scoringMode === 'best_single') {
    return null;
  }

  let best: HonorAttempt | null = null;
  for (const attempt of attempts) {
    if (attempt.count <= 0) {
      continue;
    }
    if (!best || attempt.count > best.count) {
      best = attempt;
      continue;
    }
    if (
      best &&
      attempt.count === best.count &&
      attempt.occurredAt.getTime() < best.occurredAt.getTime()
    ) {
      best = attempt;
    }
  }

  if (!best) {
    return null;
  }

  return honor(
    'best_set',
    best.userId,
    names,
    'Set beast.',
    `${best.count} in one go`,
    'I had the best set on Healthy.',
    'best_set',
  );
}

function pickFastestSet(
  attempts: HonorAttempt[],
  rules: MatchScoringRules,
  names: NameByUser,
): MatchHonor | null {
  if (rules.metric === 'walk') {
    return null;
  }

  const floor = FASTEST_MIN_COUNT[rules.metric] ?? 10;
  let best: HonorAttempt | null = null;
  let bestRateNum = 0;
  let bestRateDen = 1;

  for (const attempt of attempts) {
    if (attempt.count < floor || attempt.durationSeconds <= 0) {
      continue;
    }
    // Compare count/duration as cross-multiply to avoid floats.
    const beats =
      !best ||
      attempt.count * bestRateDen > bestRateNum * attempt.durationSeconds ||
      (attempt.count * bestRateDen === bestRateNum * attempt.durationSeconds &&
        attempt.occurredAt.getTime() < (best?.occurredAt.getTime() ?? Number.POSITIVE_INFINITY));

    if (!beats) {
      continue;
    }

    best = attempt;
    bestRateNum = attempt.count;
    bestRateDen = attempt.durationSeconds;
  }

  if (!best) {
    return null;
  }

  return honor(
    'fastest_set',
    best.userId,
    names,
    'Fastest set!',
    `${best.count} in ${best.durationSeconds}s`,
    'I had the fastest set on Healthy.',
    'fastest_set',
  );
}

function pickBiggestDay(
  events: StandingEvent[],
  rules: MatchScoringRules,
  names: NameByUser,
): MatchHonor | null {
  if (rules.scoringMode === 'days_completed') {
    return null;
  }

  const byKey = new Map<string, { userId: string; dayKey: string; total: number; at: Date }>();
  for (const event of events) {
    if (event.count <= 0) {
      continue;
    }
    const key = `${event.userId}:${event.dayKey}`;
    const prior = byKey.get(key);
    if (!prior) {
      byKey.set(key, {
        userId: event.userId,
        dayKey: event.dayKey,
        total: event.count,
        at: event.occurredAt,
      });
      continue;
    }
    prior.total += event.count;
    if (event.occurredAt.getTime() < prior.at.getTime()) {
      prior.at = event.occurredAt;
    }
  }

  let best: { userId: string; total: number; at: Date } | null = null;
  for (const row of byKey.values()) {
    if (
      !best ||
      row.total > best.total ||
      (row.total === best.total && row.at.getTime() < best.at.getTime())
    ) {
      best = row;
    }
  }

  if (!best || best.total <= 0) {
    return null;
  }

  return honor(
    'biggest_day',
    best.userId,
    names,
    'Day crusher.',
    `${best.total} in one day`,
    'I had the biggest day on Healthy.',
    'biggest_day',
  );
}

function pickFirstScore(events: StandingEvent[], names: NameByUser): MatchHonor | null {
  let first: StandingEvent | null = null;
  for (const event of events) {
    if (event.count <= 0) {
      continue;
    }
    if (!first || event.occurredAt.getTime() < first.occurredAt.getTime()) {
      first = event;
    }
  }

  if (!first) {
    return null;
  }

  return honor(
    'first_score',
    first.userId,
    names,
    'First blood.',
    'Opened the board',
    'I opened the board on Healthy.',
    'first_score',
  );
}

function pickPhotoFinish(final: StandingsResult, names: NameByUser): MatchHonor | null {
  if (!final.winnerUserId) {
    return null;
  }

  const winner = final.standings.find((row) => row.userId === final.winnerUserId);
  if (!winner || winner.score <= 0) {
    return null;
  }

  const tied = final.standings.find(
    (row) => row.userId !== winner.userId && row.score === winner.score,
  );
  if (!tied) {
    return null;
  }

  return honor(
    'photo_finish',
    tied.userId,
    names,
    'Photo finish.',
    'Same score · second by a moment',
    'I had a photo finish on Healthy.',
    'photo_finish',
  );
}

function pickComeback(
  participants: StandingParticipant[],
  events: StandingEvent[],
  rules: MatchScoringRules,
  startsAt: Date,
  endsAt: Date,
  acceptedAtByUser: ReadonlyMap<string, Date>,
  names: NameByUser,
): MatchHonor | null {
  const mid = midpointAt(startsAt, endsAt);
  const midResult = computeStandings(participants, eventsThrough(events, mid), rules);
  const final = computeStandings(participants, events, rules);
  const midRanks = rankByUser(midResult);
  const finalRanks = rankByUser(final);
  const participantCount = participants.filter((row) => !row.isPending).length;
  const topHalf = Math.ceil(participantCount / 2);

  let bestUserId: string | null = null;
  let bestDelta = 0;
  let bestFinalRank = Number.POSITIVE_INFINITY;
  let bestScoredAt = Number.POSITIVE_INFINITY;

  for (const participant of participants) {
    if (participant.isPending) {
      continue;
    }

    const acceptedAt = acceptedAtByUser.get(participant.userId);
    if (!acceptedAt || acceptedAt.getTime() > mid.getTime()) {
      continue;
    }

    const finalRank = finalRanks.get(participant.userId);
    const midRank = midRanks.get(participant.userId);
    const finalRow = final.standings.find((row) => row.userId === participant.userId);
    if (finalRank === undefined || midRank === undefined || !finalRow || finalRow.score <= 0) {
      continue;
    }
    if (finalRank > topHalf) {
      continue;
    }

    const delta = midRank - finalRank;
    if (delta <= 0) {
      continue;
    }

    const scoredAt = final.scoredAtByUser.get(participant.userId)?.getTime() ?? Number.POSITIVE_INFINITY;
    const better =
      delta > bestDelta ||
      (delta === bestDelta && finalRank < bestFinalRank) ||
      (delta === bestDelta && finalRank === bestFinalRank && scoredAt < bestScoredAt) ||
      (delta === bestDelta &&
        finalRank === bestFinalRank &&
        scoredAt === bestScoredAt &&
        participant.userId.localeCompare(bestUserId ?? '') < 0);

    if (!better) {
      continue;
    }

    bestUserId = participant.userId;
    bestDelta = delta;
    bestFinalRank = finalRank;
    bestScoredAt = scoredAt;
  }

  if (!bestUserId) {
    return null;
  }

  return honor(
    'comeback',
    bestUserId,
    names,
    'Comeback King!',
    `${ordinal(midRanks.get(bestUserId)!)} → ${ordinal(finalRanks.get(bestUserId)!)}`,
    'Comeback King in our group on Healthy.',
    'comeback',
  );
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${n}th`;
  }
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function contestDayKeys(startsAt: Date, endsAt: Date): string[] {
  // Contests use calendar day keys on events; for iron week we only need the
  // distinct dayKeys that appear in events within the window when length ≤ 7.
  const ms = endsAt.getTime() - startsAt.getTime();
  const approxDays = Math.ceil(ms / (24 * 60 * 60 * 1000));
  return approxDays <= 7 ? ['__short__'] : [];
}

function pickIronWeek(
  events: StandingEvent[],
  rules: MatchScoringRules,
  startsAt: Date,
  endsAt: Date,
  names: NameByUser,
): MatchHonor | null {
  if (rules.scoringMode !== 'days_completed') {
    return null;
  }
  if (contestDayKeys(startsAt, endsAt).length === 0) {
    return null;
  }

  const daysByUser = new Map<string, Set<string>>();
  const firstDayByUser = new Map<string, string>();
  for (const event of events) {
    if (event.count <= 0) {
      continue;
    }
    const days = daysByUser.get(event.userId) ?? new Set<string>();
    days.add(event.dayKey);
    daysByUser.set(event.userId, days);
    const first = firstDayByUser.get(event.userId);
    if (!first || event.dayKey < first) {
      firstDayByUser.set(event.userId, event.dayKey);
    }
  }

  const allDays = [...new Set(events.map((event) => event.dayKey))].sort();
  if (allDays.length === 0 || allDays.length > 7) {
    return null;
  }

  let bestUserId: string | null = null;
  let bestCount = 0;
  for (const [userId, days] of daysByUser) {
    const first = firstDayByUser.get(userId);
    if (!first) {
      continue;
    }
    const required = allDays.filter((day) => day >= first);
    const hit = required.every((day) => days.has(day));
    if (!hit) {
      continue;
    }
    if (days.size > bestCount || (days.size === bestCount && userId.localeCompare(bestUserId ?? '') < 0)) {
      bestUserId = userId;
      bestCount = days.size;
    }
  }

  if (!bestUserId || bestCount <= 0) {
    return null;
  }

  return honor(
    'iron_week',
    bestUserId,
    names,
    'Iron week.',
    `${bestCount}/${allDays.length} days`,
    'Iron week on Healthy.',
    'iron_week',
  );
}

/**
 * Derives shareable honors for a finished contest. Recomputed on read with
 * standings; side awards require at least three scorers.
 */
export function computeMatchHonors(input: MatchHonorsInput): MatchHonor[] {
  const { participants, events, attempts, rules, startsAt, endsAt, acceptedAtByUser } = input;
  const names: NameByUser = new Map(
    participants.map((participant) => [participant.userId, participant.displayName]),
  );
  const final = computeStandings(participants, events, rules);
  const scorers = scoredUserIds(final);
  const comeback =
    scorers.length >= SIDE_HONOR_MIN_SCORERS
      ? pickComeback(participants, events, rules, startsAt, endsAt, acceptedAtByUser, names)
      : null;

  const honors: MatchHonor[] = [];
  const champion = championHonor(final, names, comeback?.userId ?? null);
  if (champion) {
    honors.push(champion);
  }

  if (scorers.length < SIDE_HONOR_MIN_SCORERS) {
    return honors;
  }

  const side = [
    pickBestSet(attempts, rules, names),
    pickFastestSet(attempts, rules, names),
    pickBiggestDay(events, rules, names),
    pickFirstScore(events, names),
    pickPhotoFinish(final, names),
    comeback,
    pickIronWeek(events, rules, startsAt, endsAt, names),
  ];

  for (const row of side) {
    if (!row) {
      continue;
    }
    // One recipient per kind already; skip duplicate kinds if any.
    if (honors.some((existing) => existing.kind === row.kind)) {
      continue;
    }
    honors.push(row);
  }

  return honors;
}

/** Viewer's primary brag title for list rows and settlement push. */
export function primaryHonorTitleFor(
  honors: readonly MatchHonor[],
  userId: string,
): string | null {
  for (const kind of HONOR_PRIMARY_ORDER) {
    const hit = honors.find((row) => row.kind === kind && row.userId === userId);
    if (hit) {
      // Champion title is second-person on the card; list uses a short crown label.
      if (hit.kind === 'champion') {
        return 'Crown';
      }
      return hit.title.replace(/\.$/, '');
    }
  }
  return null;
}
