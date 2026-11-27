import type { ChallengeFinish } from '@/lib/challenge-finish-session';
import { withFinishedCard } from './finished-deck';
import { todayChallenge } from './testing/today-fixtures';
import type { ChallengeDeckItem, DeckItem } from './types/today-deck';

function challengeItem(id: string, title: string): ChallengeDeckItem {
  return {
    type: 'challenge',
    key: id,
    challenge: todayChallenge({ id, title }),
    kind: 'walk',
    position: 1,
    tag: null,
    tip: null,
    detail: null,
  } as ChallengeDeckItem;
}

function finishOf(
  id: string,
  outcome: ChallengeFinish['outcome'] = { kind: 'checkedIn' },
): ChallengeFinish {
  return {
    challenge: todayChallenge({ id, title: 'Stretch before bed' }),
    outcome,
    pointsAwarded: 100,
    penaltyApplied: 0,
    currentStreakDays: 3,
    finishedAt: 1,
  };
}

describe('withFinishedCard', () => {
  it('puts the finished card on top and names what comes next', () => {
    const items: DeckItem[] = [challengeItem('uc2', 'Log your water')];
    const [top, next] = withFinishedCard(items, finishOf('uc1'));

    expect(top).toMatchObject({ type: 'finished', nextLabel: 'Next: Log your water' });
    expect(next).toBe(items[0]);
  });

  it('never deals the finished challenge twice while the list catches up', () => {
    const items: DeckItem[] = [
      challengeItem('uc1', 'Stretch before bed'),
      challengeItem('uc2', 'Log your water'),
    ];

    expect(withFinishedCard(items, finishOf('uc1')).map((item) => item.key)).toEqual([
      'finished-uc1-1',
      'uc2',
    ]);
  });

  it('points at the day card once the last one is done', () => {
    const [top] = withFinishedCard([{ type: 'dayDone', key: 'day-done' }], finishOf('uc1'));

    expect(top).toMatchObject({ nextLabel: 'See the day' });
  });

  it('closes an extra set with Done', () => {
    const [top] = withFinishedCard([], finishOf('uc1', { kind: 'extraSet', count: 15 }));

    expect(top).toMatchObject({ nextLabel: 'Done' });
  });
});
