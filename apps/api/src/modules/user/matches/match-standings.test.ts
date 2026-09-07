import { describe, expect, it } from 'vitest';
import { computeBestSingleStandings } from './match-standings.js';

const host = { userId: 'host', displayName: 'Ada', isHost: true };
const bee = { userId: 'bee', displayName: 'Bee', isHost: false };
const cam = { userId: 'cam', displayName: 'Cam', isHost: false };

describe('computeBestSingleStandings', () => {
  it('ranks by highest single set and names that person the winner', () => {
    const result = computeBestSingleStandings(
      [host, bee],
      [
        { userId: 'host', count: 12, recordedAt: new Date('2026-09-04T10:00:00.000Z') },
        { userId: 'bee', count: 20, recordedAt: new Date('2026-09-04T11:00:00.000Z') },
        { userId: 'bee', count: 8, recordedAt: new Date('2026-09-04T12:00:00.000Z') },
      ],
    );

    expect(result.winnerUserId).toBe('bee');
    expect(result.standings).toEqual([
      {
        userId: 'bee',
        displayName: 'Bee',
        rank: 1,
        bestCount: 20,
        isHost: false,
      },
      {
        userId: 'host',
        displayName: 'Ada',
        rank: 2,
        bestCount: 12,
        isHost: true,
      },
    ]);
  });

  it('breaks a tied best count with who reached it first', () => {
    const result = computeBestSingleStandings(
      [host, bee],
      [
        { userId: 'bee', count: 15, recordedAt: new Date('2026-09-04T12:00:00.000Z') },
        { userId: 'host', count: 15, recordedAt: new Date('2026-09-04T10:00:00.000Z') },
      ],
    );

    expect(result.winnerUserId).toBe('host');
    expect(result.standings.map((row) => row.userId)).toEqual(['host', 'bee']);
    expect(result.standings.map((row) => row.rank)).toEqual([1, 1]);
  });

  it('leaves people with no set at the bottom and names no winner', () => {
    const result = computeBestSingleStandings([host, bee, cam], []);

    expect(result.winnerUserId).toBeNull();
    expect(result.standings.map((row) => row.userId)).toEqual([
      'bee',
      'cam',
      'host',
    ]);
    expect(result.standings.every((row) => row.bestCount === 0)).toBe(true);
  });
});
