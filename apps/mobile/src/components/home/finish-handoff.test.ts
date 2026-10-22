import type { ChallengeFinish } from '@/lib/challenge-finish-session';
import { daySuccessParams, friendSourceForFinish, isDayFinishedBy } from './finish-handoff';
import { todayChallenge } from './testing/today-fixtures';
import type { ChallengeDeckItem, DeckItem } from './types/today-deck';

const pushups = {
  kind: 'device_session',
  metric: 'pushups',
  target: { durationMinutes: null, distanceMeters: null, count: 20 },
} as const;

function finish(overrides: Partial<ChallengeFinish>): ChallengeFinish {
  return {
    challenge: todayChallenge({ id: 'uc-push', title: 'Do 20 push-ups', capture: pushups }),
    outcome: { kind: 'reps', count: 22, durationSeconds: 41 },
    pointsAwarded: 150,
    penaltyApplied: 0,
    currentStreakDays: 6,
    finishedAt: 1,
    ...overrides,
  };
}

function challengeItem(id: string): DeckItem {
  return { type: 'challenge', key: id, challenge: todayChallenge({ id }) } as ChallengeDeckItem;
}

describe('finish handoff', () => {
  it('challenges a friend to the reps, the walk, or a week of finished days', () => {
    expect(friendSourceForFinish(finish({}))).toEqual({ kind: 'reps', count: 22 });
    expect(
      friendSourceForFinish(
        finish({ outcome: { kind: 'walk', durationSeconds: 600, distanceMeters: 900 } }),
      ),
    ).toEqual({
      kind: 'walk',
    });
    expect(friendSourceForFinish(finish({ outcome: { kind: 'checkedIn' } }))).toEqual({
      kind: 'day',
    });
  });

  it('finishes the day only when no other challenge is open', () => {
    expect(
      isDayFinishedBy(finish({}), [challengeItem('uc-push'), { type: 'dayDone', key: 'day-done' }]),
    ).toBe(true);
    expect(isDayFinishedBy(finish({}), [challengeItem('uc-push'), challengeItem('uc-water')])).toBe(
      false,
    );
  });

  it('never treats an extra set as the end of the day', () => {
    expect(isDayFinishedBy(finish({ outcome: { kind: 'extraSet', count: 15 } }), [])).toBe(false);
  });

  it('opens the Well done page with the set, the streak and the day flag', () => {
    expect(daySuccessParams(finish({}))).toEqual({
      title: 'Do 20 push-ups',
      points: '150',
      streak: '6',
      penalty: '0',
      userChallengeId: 'uc-push',
      metric: 'pushups',
      face: 'reps',
      day: '1',
      count: '22',
      target: '20',
    });
  });
});
