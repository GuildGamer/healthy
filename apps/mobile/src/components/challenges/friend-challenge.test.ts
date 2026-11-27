import {
  MATCH_MIN_DAYS_BY_SCORING_MODE,
  isScoringModeAllowedForMetric,
  isWindowAllowedForScoringMode,
} from '@product/contract/match-board';
import {
  friendChallengeSpec,
  friendSourceForCompletion,
  parseShareFriend,
  shareFriendParams,
} from './friend-challenge';
import type { FriendChallengeSource } from './types/friend-challenge';

const sources: FriendChallengeSource[] = [
  { kind: 'reps', count: 22, metric: 'pushups' },
  { kind: 'reps', count: 30, metric: 'squats' },
  { kind: 'walk' },
  { kind: 'day' },
];

describe('friendChallengeSpec', () => {
  it('turns reps into a best-set duel today, seeded with the set just done', () => {
    expect(friendChallengeSpec({ kind: 'reps', count: 22, metric: 'pushups' })).toEqual({
      match: { metric: 'pushups', scoringMode: 'best_single', window: 'today', seedCount: 22 },
      metricLabel: 'push-ups',
    });
  });

  it('keeps the exercise the member just finished', () => {
    expect(friendChallengeSpec({ kind: 'reps', count: 20, metric: 'squats' })).toEqual({
      match: { metric: 'squats', scoringMode: 'best_single', window: 'today', seedCount: 20 },
      metricLabel: 'squats',
    });
  });

  it('turns any other daily challenge into a week of finished days, whatever it was', () => {
    expect(friendChallengeSpec({ kind: 'day' }).match).toMatchObject({
      scoringMode: 'days_completed',
      dailyScope: 'any_challenge',
    });
  });

  it.each(sources)('only ever asks for a contest the server accepts (%o)', (source) => {
    const { match } = friendChallengeSpec(source);
    const metric = match.metric ?? 'pushups';
    const scoringMode = match.scoringMode ?? 'best_single';

    expect(isScoringModeAllowedForMetric(metric, scoringMode)).toBe(true);
    expect(match.window && isWindowAllowedForScoringMode(scoringMode, match.window)).toBe(true);
    expect(MATCH_MIN_DAYS_BY_SCORING_MODE[scoringMode]).toBeGreaterThan(0);
  });
});

describe('friendSourceForCompletion', () => {
  it('seeds a past push-up set and treats a walk as a walk', () => {
    expect(
      friendSourceForCompletion({ share: { kind: 'reps', count: 22 }, metric: 'pushups' }),
    ).toEqual({
      kind: 'reps',
      count: 22,
      metric: 'pushups',
    });
    expect(
      friendSourceForCompletion({ share: { kind: 'minutes', minutes: 20 }, metric: 'walk' }),
    ).toEqual({ kind: 'walk' });
  });

  it('carries a squat set into the invite', () => {
    expect(
      friendSourceForCompletion({ share: { kind: 'reps', count: 20 }, metric: 'squats' }),
    ).toEqual({ kind: 'reps', count: 20, metric: 'squats' });
  });

  it('sends a reading, and anything else, into a week of finished days', () => {
    expect(friendSourceForCompletion({ share: null, metric: null })).toEqual({ kind: 'day' });
    expect(
      friendSourceForCompletion({ share: { kind: 'glasses', count: 6 }, metric: null }),
    ).toEqual({ kind: 'day' });
    expect(friendSourceForCompletion({ share: { kind: 'gym' }, metric: null })).toEqual({
      kind: 'day',
    });
  });
});

describe('shareFriendParams / parseShareFriend', () => {
  it('round-trips the metric on a reps invite', () => {
    const params = shareFriendParams({
      source: { kind: 'reps', count: 18, metric: 'plank' },
      userChallengeId: 'uc1',
      isEligible: true,
    });
    expect(params).toMatchObject({ friend: 'reps', count: '18', metric: 'plank' });
    expect(parseShareFriend(params)).toEqual({
      source: { kind: 'reps', count: 18, metric: 'plank' },
      userChallengeId: 'uc1',
      isEligible: true,
    });
  });

  it('defaults a missing metric to push-ups for old routes', () => {
    expect(
      parseShareFriend({ friend: 'reps', count: '10', userChallengeId: 'uc1' }),
    ).toEqual({
      source: { kind: 'reps', count: 10, metric: 'pushups' },
      userChallengeId: 'uc1',
      isEligible: true,
    });
  });
});
