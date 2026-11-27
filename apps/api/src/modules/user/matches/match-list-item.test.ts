import type { MatchStanding } from '@product/contract';
import { describe, expect, it } from 'vitest';
import { lastMoveFor, rosterFor } from './match-list-item.js';

function standing(userId: string, rank: number, overrides: Partial<MatchStanding> = {}) {
  return {
    userId,
    displayName: userId,
    image: null,
    rank,
    score: 10 - rank,
    bestCount: 10 - rank,
    isYou: false,
    isHost: false,
    isPending: false,
    ...overrides,
  };
}

describe('rosterFor', () => {
  it('keeps the top rows when the viewer is among them', () => {
    const standings = [
      standing('jess', 1),
      standing('you', 2, { isYou: true }),
      standing('sam', 3),
      standing('kit', 4),
    ];

    expect(rosterFor(standings, 3).map((row) => row.userId)).toEqual(['jess', 'you', 'sam']);
  });

  it('swaps the viewer into the last row when they sit lower', () => {
    const standings = [
      standing('jess', 1),
      standing('sam', 2),
      standing('kit', 3),
      standing('you', 4, { isYou: true }),
    ];

    expect(rosterFor(standings, 3).map((row) => row.userId)).toEqual(['jess', 'sam', 'you']);
  });
});

describe('lastMoveFor', () => {
  const now = new Date('2026-10-22T14:00:00.000Z');

  it('picks the latest move by another accepted member today', () => {
    const standings = [
      standing('jess', 1),
      standing('sam', 2),
      standing('you', 3, { isYou: true }),
    ];
    const scoredAtByUser = new Map([
      ['jess', new Date('2026-10-22T09:00:00.000Z')],
      ['sam', new Date('2026-10-22T13:40:00.000Z')],
      ['you', new Date('2026-10-22T13:55:00.000Z')],
    ]);

    expect(lastMoveFor({ standings, scoredAtByUser, timeZone: 'UTC', now })).toEqual({
      displayName: 'sam',
      image: null,
      movedAt: '2026-10-22T13:40:00.000Z',
    });
  });

  it('ignores yesterday in the contest zone, the viewer, and pending seats', () => {
    const standings = [
      standing('jess', 1),
      standing('cam', 2, { isPending: true }),
      standing('you', 3, { isYou: true }),
    ];
    const scoredAtByUser = new Map([
      ['jess', new Date('2026-10-21T23:30:00.000Z')],
      ['cam', new Date('2026-10-22T13:00:00.000Z')],
      ['you', new Date('2026-10-22T13:55:00.000Z')],
    ]);

    expect(lastMoveFor({ standings, scoredAtByUser, timeZone: 'UTC', now })).toBeNull();
    expect(
      lastMoveFor({ standings, scoredAtByUser, timeZone: 'Africa/Nairobi', now }),
    ).toMatchObject({ displayName: 'jess' });
  });
});
