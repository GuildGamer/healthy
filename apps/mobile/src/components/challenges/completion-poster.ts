import type {
  CatalogChallenge,
  ChallengeHistoryEntry,
  ChallengeHistoryLog,
  DeviceMetric,
  ProgressDoneItem,
  ProgressShareResult,
} from '@product/client';
import { emptyChallengeTarget } from '@product/contract/challenge-capture';
import { displayChallengeTitle } from '@product/contract/challenge-title';
import { isPoseMetric } from '@product/contract/match-board';
import { deckCardKindFor } from '@/components/deck';
import { formatClockTime } from '@/lib/clock-time';
import { friendSourceForCompletion, shareFriendParams } from './friend-challenge';
import { sharePosterParams } from './share-poster';
import type { SharePoster } from './types/share-poster';

const READING_KINDS = new Set<ProgressDoneItem['completionKind']>([
  'vitals_bp',
  'glucose',
  'peak_flow',
  'carbs',
]);

/** Weight, heart rate, and sleep. Step totals are left off the image as well. */
const READING_METRICS = new Set<DeviceMetric>(['weight', 'heart_rate', 'sleep']);

const QUIET_LOGGED = 'Logged';
const QUIET_DONE = 'Done';
/** Same line the finish card puts under a walk. */
const WALK_UNIT = 'minutes walked';
/** Same line the finish card puts under a gym check-in. */
const GYM_UNIT = 'at the gym';

export type CompletionChallenge = Pick<
  CatalogChallenge,
  'title' | 'category' | 'completionKind' | 'capture'
>;

const FALLBACK_MARK: CompletionChallenge = {
  title: 'Challenge',
  category: 'general',
  completionKind: 'check_in',
  capture: { kind: 'self_report', metric: null, target: emptyChallengeTarget },
};

type PosterInput = {
  title: string;
  completedAt: string;
  mark: Pick<ProgressDoneItem, 'category' | 'completionKind' | 'capture'>;
  share: ProgressShareResult | null;
  log?: ChallengeHistoryLog | null;
};

/** The share card for a finish already loaded on the day screen. */
export function posterForDoneItem(item: ProgressDoneItem): SharePoster {
  return completionPoster({
    title: item.title,
    completedAt: item.completedAt,
    mark: item,
    share: item.share,
  });
}

/** The share card for one row of a challenge's own history. */
export function posterForHistoryEntry(
  entry: Pick<ChallengeHistoryEntry, 'completedAt' | 'log'>,
  challenge: CompletionChallenge | null,
): SharePoster {
  const mark = challenge ?? FALLBACK_MARK;

  return completionPoster({
    title: challenge ? titled(challenge) : FALLBACK_MARK.title,
    completedAt: entry.completedAt,
    mark,
    share: shareFromHistoryLog(entry.log),
    log: entry.log,
  });
}

/** Route into the existing share screen. The poster and the invite travel in the URL. */
export function completionShareRoute(input: {
  poster: SharePoster;
  source: ReturnType<typeof friendSourceForCompletion>;
  userChallengeId: string;
  isEligible: boolean;
}): { pathname: '/challenge/share'; params: Record<string, string> } {
  return {
    pathname: '/challenge/share',
    params: {
      ...sharePosterParams(input.poster),
      ...shareFriendParams(input),
    },
  };
}

/** A day-detail row: rewarded already, so the invite stays eligible. */
export function dayCompletionShareRoute(item: ProgressDoneItem) {
  return completionShareRoute({
    poster: posterForDoneItem(item),
    source: friendSourceForCompletion({ share: item.share, metric: item.capture.metric }),
    userChallengeId: item.userChallengeId,
    isEligible: true,
  });
}

/** One row of a challenge's own history. A penalty skips the invite, as a penalised finish does. */
export function historyCompletionShareRoute(
  entry: Pick<ChallengeHistoryEntry, 'id' | 'completedAt' | 'log' | 'outcome'>,
  challenge: CompletionChallenge | null,
) {
  const metric =
    challenge?.capture.metric ?? (entry.log?.kind === 'device' ? entry.log.metric : null);

  return completionShareRoute({
    poster: posterForHistoryEntry(entry, challenge),
    source: friendSourceForCompletion({ share: shareFromHistoryLog(entry.log), metric }),
    userChallengeId: entry.id,
    isEligible: entry.outcome !== 'penalized',
  });
}

function titled(challenge: CompletionChallenge): string {
  return displayChallengeTitle({
    title: challenge.title,
    metric: challenge.capture.metric,
    count: challenge.capture.target.count,
  });
}

function completionPoster(input: PosterInput): SharePoster {
  const measured = measuredPoster(input);
  if (measured) {
    return measured;
  }

  return {
    kind: deckCardKindFor(input.mark),
    label: input.title,
    value: isReading(input.mark, input.log) ? QUIET_LOGGED : QUIET_DONE,
    unit: dayLabel(input.completedAt),
    when: input.completedAt,
  };
}

function measuredPoster(input: PosterInput): SharePoster | null {
  const { share } = input;
  if (!share) {
    return null;
  }

  if (share.kind === 'reps') {
    return poster(input, String(share.count), 'push-ups');
  }

  if (share.kind === 'minutes') {
    return poster(input, String(share.minutes), minuteUnit(input.mark.capture.metric));
  }

  if (share.kind === 'glasses') {
    return poster(input, String(share.count), 'glasses');
  }

  return poster(input, formatClockTime(new Date(input.completedAt)), GYM_UNIT);
}

function poster(input: PosterInput, value: string, unit: string): SharePoster {
  return {
    kind: deckCardKindFor(input.mark),
    label: input.title,
    value,
    unit,
    when: input.completedAt,
  };
}

function minuteUnit(metric: DeviceMetric | null): string {
  if (metric === 'run') {
    return 'minutes running';
  }

  if (metric === 'cycle') {
    return 'minutes cycled';
  }

  return WALK_UNIT;
}

function dayLabel(completedAt: string): string {
  return new Date(completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function isReading(
  mark: Pick<ProgressDoneItem, 'completionKind' | 'capture'>,
  log: ChallengeHistoryLog | null | undefined,
): boolean {
  if (READING_KINDS.has(mark.completionKind)) {
    return true;
  }

  if (mark.capture.metric != null && READING_METRICS.has(mark.capture.metric)) {
    return true;
  }

  return logIsReading(log);
}

function logIsReading(log: ChallengeHistoryLog | null | undefined): boolean {
  if (!log || log.kind === 'check_in' || log.kind === 'evidence_photo' || log.kind === 'water') {
    return false;
  }

  if (log.kind === 'device') {
    return READING_METRICS.has(log.metric);
  }

  // vitals, glucose, peak flow, carbs, and sleep stay off the share image.
  return true;
}

/** History already holds the log. Only the shareable part is copied onto the card. */
function shareFromHistoryLog(log: ChallengeHistoryLog | null): ProgressShareResult | null {
  if (!log) {
    return null;
  }

  if (log.kind === 'evidence_photo') {
    return { kind: 'gym' };
  }

  if (log.kind === 'water' && log.unit === 'glasses') {
    return { kind: 'glasses', count: log.amount };
  }

  if (log.kind !== 'device') {
    return null;
  }

  if (log.metric && isPoseMetric(log.metric) && log.count != null) {
    return { kind: 'reps', count: log.count };
  }

  if (!isMinuteMetric(log.metric) || log.durationSeconds == null || log.durationSeconds <= 0) {
    return null;
  }

  return { kind: 'minutes', minutes: Math.max(1, Math.floor(log.durationSeconds / 60)) };
}

function isMinuteMetric(metric: DeviceMetric): boolean {
  return metric === 'walk' || metric === 'run' || metric === 'cycle';
}
