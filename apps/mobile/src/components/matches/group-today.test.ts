import type { MatchStanding } from '@product/client';
import { faceLookFor, faceTapFor, groupTitle, placeLabel, todayTally } from './group-today';

function standing(overrides: Partial<MatchStanding> = {}): MatchStanding {
  return {
    userId: 'ada',
    displayName: 'Ada',
    image: null,
    rank: 1,
    score: 0,
    bestCount: 0,
    isYou: false,
    isHost: false,
    isPending: false,
    doneToday: false,
    yourReactionsToday: [],
    ...overrides,
  };
}

const walkTotal = {
  scoringMode: 'cumulative_total',
  metric: 'walk',
  dailyScope: 'any_challenge',
} as const;

describe('faceTapFor', () => {
  it('cheers someone done today and nudges someone who is not', () => {
    expect(faceTapFor(standing({ doneToday: true }))).toEqual({ kind: 'cheer' });
    expect(faceTapFor(standing({ doneToday: false }))).toEqual({ kind: 'nudge' });
  });

  it('explains a second tap of the same kind instead of sending again', () => {
    const sent = { kind: 'nudge', sentAt: '2026-10-22T10:40:00.000Z' } as const;
    expect(faceTapFor(standing({ yourReactionsToday: [sent] }))).toEqual({
      kind: 'alreadySent',
      sent,
    });
  });

  it('still cheers someone nudged earlier, once they are done', () => {
    const nudged = { kind: 'nudge', sentAt: '2026-10-22T10:40:00.000Z' } as const;
    expect(faceTapFor(standing({ doneToday: true, yourReactionsToday: [nudged] }))).toEqual({
      kind: 'cheer',
    });
  });

  it('does nothing for your own face or a seat that has not accepted', () => {
    expect(faceTapFor(standing({ isYou: true }))).toEqual({ kind: 'none' });
    expect(faceTapFor(standing({ isPending: true }))).toEqual({ kind: 'none' });
  });
});

describe('todayTally', () => {
  it('counts only the people playing', () => {
    const tally = todayTally([
      standing({ userId: 'a', doneToday: true }),
      standing({ userId: 'b' }),
      standing({ userId: 'c', isPending: true }),
    ]);

    expect(tally).toEqual({ done: 1, total: 2 });
    expect(faceLookFor(standing({ isPending: true }))).toBe('pending');
  });
});

describe('groupTitle', () => {
  it('names the other members', () => {
    expect(
      groupTitle(
        [
          standing({ isYou: true, displayName: 'Nurul' }),
          standing({ userId: 'a', displayName: 'Ada' }),
          standing({ userId: 't', displayName: 'Tunde' }),
          standing({ userId: 'k', displayName: 'Kemi' }),
        ],
        walkTotal,
      ),
    ).toBe('Ada, Tunde +1');
  });

  it('names the activity while nobody else is in', () => {
    expect(groupTitle([standing({ isYou: true })], walkTotal)).toBe('Your walking group');
  });
});

describe('placeLabel', () => {
  it('gives a place only once somebody has scored', () => {
    const you = standing({ isYou: true, rank: 2, score: 0 });
    const ada = standing({ userId: 'a', rank: 1, score: 0 });

    expect(placeLabel([ada, you])).toBe('–');
    expect(
      placeLabel([
        { ...ada, score: 10 },
        { ...you, score: 4 },
      ]),
    ).toBe('2nd');
  });
});
