import {
  MATCH_MIN_DAYS_BY_SCORING_MODE,
  isScoringModeAllowedForMetric,
  isWindowAllowedForScoringMode,
} from '@product/contract/match-board';
import { friendChallengeSpec, friendSourceForCompletion } from './friend-challenge';
import type { FriendChallengeSource } from './types/friend-challenge';

const sources: FriendChallengeSource[] = [
  { kind: 'reps', count: 22 },
  { kind: 'walk' },
  { kind: 'day' },
];

describe('friendChallengeSpec', () => {
  it('turns reps into a best-set duel today, seeded with the set just done', () => {
    expect(friendChallengeSpec({ kind: 'reps', count: 22 })).toEqual({
      match: { metric: 'pushups', scoringMode: 'best_single', window: 'today', seedCount: 22 },
      metricLabel: 'push-ups',
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
    });
    expect(
      friendSourceForCompletion({ share: { kind: 'minutes', minutes: 20 }, metric: 'walk' }),
    ).toEqual({ kind: 'walk' });
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
