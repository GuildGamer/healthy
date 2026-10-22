import type { ChallengeCapture } from '@product/contract';
import { describe, expect, it } from 'vitest';
import { buildOccurrenceDetails, measuredAmount } from './today-details.js';
import type { DueOccurrence, MeasuredSession } from './types/today-details.js';

const noTarget = { durationMinutes: null, distanceMeters: null, count: null };

const walkCapture: ChallengeCapture = {
  kind: 'device_session',
  metric: 'walk',
  target: { ...noTarget, durationMinutes: 10 },
};

const pushupCapture: ChallengeCapture = {
  kind: 'device_session',
  metric: 'pushups',
  target: { ...noTarget, count: 20 },
};

const readingCapture: ChallengeCapture = { kind: 'structured_log', metric: null, target: noTarget };

function occurrence(
  id: string,
  capture: ChallengeCapture,
  periodKey = '2026-10-22',
  completedAt: Date | null = null,
): DueOccurrence {
  return { id, challengeId: `challenge-${id}`, periodKey, completedAt, capture };
}

function session(overrides: Partial<MeasuredSession>): MeasuredSession {
  return {
    metric: 'walk',
    dayKey: '2026-10-22',
    durationSeconds: null,
    distanceMeters: null,
    count: null,
    ...overrides,
  };
}

const baseInput = {
  lastCompletedDayKeyByChallenge: new Map<string, string>(),
  completedDayKeysByChallenge: new Map<string, ReadonlySet<string>>(),
  sessions: [] as MeasuredSession[],
  dayKey: '2026-10-22',
  weekStartKey: '2026-10-19',
};

describe('measuredAmount', () => {
  it('reads a session in the unit its target counts', () => {
    const walk = session({ durationSeconds: 299, distanceMeters: 400, count: 600 });

    expect(measuredAmount(walk, walkCapture.target)).toBe(4);
    expect(measuredAmount(walk, pushupCapture.target)).toBe(600);
    expect(measuredAmount(walk, { ...noTarget, distanceMeters: 1_000 })).toBe(400);
    expect(measuredAmount(walk, noTarget)).toBeNull();
  });
});

describe('buildOccurrenceDetails', () => {
  it('takes the best single session today, never a sum', () => {
    const [detail] = buildOccurrenceDetails({
      ...baseInput,
      occurrences: [occurrence('pushups', pushupCapture)],
      sessions: [
        session({ metric: 'pushups', count: 9 }),
        session({ metric: 'pushups', count: 14 }),
        session({ metric: 'pushups', count: 30, dayKey: '2026-10-21' }),
        session({ metric: 'walk', count: 99 }),
      ],
    });

    expect(detail?.bestMeasuredInPeriod).toBe(14);
  });

  it('reads the whole week for a weekly card, and nothing for a logged one', () => {
    const details = buildOccurrenceDetails({
      ...baseInput,
      occurrences: [
        occurrence('long-walk', walkCapture, '2026-10-19'),
        occurrence('reading', readingCapture),
      ],
      sessions: [session({ dayKey: '2026-10-20', durationSeconds: 720 })],
    });

    expect(details.map((detail) => detail.bestMeasuredInPeriod)).toEqual([12, null]);
  });

  it('marks this week’s days finished or measured, and when it was last done', () => {
    const [walk, reading] = buildOccurrenceDetails({
      ...baseInput,
      occurrences: [occurrence('walk', walkCapture), occurrence('reading', readingCapture)],
      lastCompletedDayKeyByChallenge: new Map([['challenge-reading', '2026-10-19']]),
      completedDayKeysByChallenge: new Map([
        ['challenge-walk', new Set(['2026-10-18', '2026-10-20'])],
        ['challenge-reading', new Set(['2026-10-19'])],
      ]),
      sessions: [
        session({ dayKey: '2026-10-21', durationSeconds: 120 }),
        session({ dayKey: '2026-10-20', durationSeconds: 900 }),
      ],
    });

    expect(walk).toMatchObject({
      lastCompletedDayKey: null,
      activeDayKeys: ['2026-10-20', '2026-10-21'],
    });
    expect(reading).toMatchObject({
      lastCompletedDayKey: '2026-10-19',
      bestMeasuredInPeriod: null,
      activeDayKeys: ['2026-10-19'],
    });
  });

  it('says when the card’s own occurrence was finished, and null while it is open', () => {
    const finishedAt = new Date('2026-10-22T08:10:00.000Z');
    const [done, open] = buildOccurrenceDetails({
      ...baseInput,
      occurrences: [
        occurrence('reading', readingCapture, '2026-10-22', finishedAt),
        occurrence('walk', walkCapture),
      ],
    });

    expect(done?.completedAt).toBe('2026-10-22T08:10:00.000Z');
    expect(open?.completedAt).toBeNull();
  });
});
