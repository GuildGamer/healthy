import type { DeviceMetric, MatchMetric, ProgressShareResult } from '@product/client';
import { isPoseMetric, matchMetricSchema } from '@product/contract/match-board';
import { MATCH_METRIC_UNIT } from '@/components/matches/match-metric';
import type {
  FriendChallengeSource,
  FriendChallengeSpec,
  ShareFriend,
} from './types/friend-challenge';

const DEFAULT_REP_METRIC: MatchMetric = 'pushups';

/**
 * The contest each kind of finish invites a friend into. Reps become a
 * best-set duel today; a walk becomes a day's total; anything else becomes a
 * week of finished days.
 */
export function friendChallengeSpec(source: FriendChallengeSource): FriendChallengeSpec {
  if (source.kind === 'reps') {
    const metric = source.metric;
    return {
      match: {
        metric,
        scoringMode: 'best_single',
        window: 'today',
        seedCount: source.count > 0 ? source.count : undefined,
      },
      metricLabel: MATCH_METRIC_UNIT[metric],
    };
  }

  if (source.kind === 'walk') {
    return {
      match: { metric: 'walk', scoringMode: 'cumulative_total', window: 'today' },
      metricLabel: null,
    };
  }

  return {
    match: {
      metric: 'walk',
      scoringMode: 'days_completed',
      dailyScope: 'any_challenge',
      window: 'week',
    },
    metricLabel: null,
  };
}

/**
 * A stored finish, in the same terms as a card that just flipped.
 * Reps and a walk keep their contest. A reading, or anything without those
 * results, becomes a week of finished days.
 */
export function friendSourceForCompletion(input: {
  share: ProgressShareResult | null;
  metric: DeviceMetric | null;
}): FriendChallengeSource {
  if (input.share?.kind === 'reps') {
    const metric =
      input.metric && isPoseMetric(input.metric) ? input.metric : DEFAULT_REP_METRIC;
    return { kind: 'reps', count: input.share.count, metric };
  }

  if (input.share?.kind === 'minutes' && input.metric === 'walk') {
    return { kind: 'walk' };
  }

  return { kind: 'day' };
}

/** Route fields for the invite. Separate from the poster, so a reading never rides along. */
export function shareFriendParams(input: {
  source: FriendChallengeSource;
  userChallengeId: string;
  isEligible: boolean;
}): Record<string, string> {
  return {
    friend: input.source.kind,
    userChallengeId: input.userChallengeId,
    ...(input.source.kind === 'reps'
      ? { count: String(input.source.count), metric: input.source.metric }
      : {}),
    ...(input.isEligible ? {} : { eligible: '0' }),
  };
}

/** Reads the invite back from the route. Absent when this share was not opened from history. */
export function parseShareFriend(params: {
  friend?: string;
  count?: string;
  metric?: string;
  userChallengeId?: string;
  eligible?: string;
}): ShareFriend | null {
  const userChallengeId = params.userChallengeId;
  if (!userChallengeId || !isFriendKind(params.friend)) {
    return null;
  }

  const isEligible = params.eligible !== '0';
  if (params.friend === 'walk') {
    return { source: { kind: 'walk' }, userChallengeId, isEligible };
  }

  if (params.friend === 'day') {
    return { source: { kind: 'day' }, userChallengeId, isEligible };
  }

  const count = Number.parseInt(params.count ?? '', 10);
  if (!Number.isFinite(count) || count < 0) {
    return { source: { kind: 'day' }, userChallengeId, isEligible };
  }

  const parsed = matchMetricSchema.safeParse(params.metric);
  const metric =
    parsed.success && isPoseMetric(parsed.data) ? parsed.data : DEFAULT_REP_METRIC;

  return { source: { kind: 'reps', count, metric }, userChallengeId, isEligible };
}

function isFriendKind(value: string | undefined): value is FriendChallengeSource['kind'] {
  return value === 'reps' || value === 'walk' || value === 'day';
}
