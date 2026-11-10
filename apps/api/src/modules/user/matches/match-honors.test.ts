import { describe, expect, it } from 'vitest';
import {
  computeMatchHonors,
  primaryHonorTitleFor,
  type HonorAttempt,
  type MatchHonorsInput,
} from './match-honors.js';
import type { MatchScoringRules, StandingEvent, StandingParticipant } from './match-standings.js';

const ada: StandingParticipant = {
  userId: 'ada',
  displayName: 'Ada',
  image: null,
  isHost: true,
  isPending: false,
};
const bee: StandingParticipant = {
  userId: 'bee',
  displayName: 'Bee',
  image: null,
  isHost: false,
  isPending: false,
};
const cam: StandingParticipant = {
  userId: 'cam',
  displayName: 'Cam',
  image: null,
  isHost: false,
  isPending: false,
};
const dee: StandingParticipant = {
  userId: 'dee',
  displayName: 'Dee',
  image: null,
  isHost: false,
  isPending: false,
};

const START = new Date('2026-11-01T00:00:00.000Z');
const END = new Date('2026-11-08T00:00:00.000Z');
const MID = new Date('2026-11-04T12:00:00.000Z');

function accepted(map: Record<string, string>): Map<string, Date> {
  return new Map(Object.entries(map).map(([id, iso]) => [id, new Date(iso)]));
}

function event(
  userId: string,
  count: number,
  at: string,
  dayKey = at.slice(0, 10),
): StandingEvent {
  return { userId, count, dayKey, occurredAt: new Date(at) };
}

function attempt(
  userId: string,
  count: number,
  durationSeconds: number,
  at: string,
): HonorAttempt {
  return { ...event(userId, count, at), durationSeconds };
}

function input(overrides: Partial<MatchHonorsInput> = {}): MatchHonorsInput {
  const rules: MatchScoringRules = { scoringMode: 'cumulative_total', metric: 'pushups' };
  return {
    participants: [ada, bee, cam, dee],
    events: [],
    attempts: [],
    rules,
    startsAt: START,
    endsAt: END,
    acceptedAtByUser: accepted({
      ada: '2026-11-01T00:00:00.000Z',
      bee: '2026-11-01T00:00:00.000Z',
      cam: '2026-11-01T00:00:00.000Z',
      dee: '2026-11-01T00:00:00.000Z',
    }),
    ...overrides,
  };
}

describe('computeMatchHonors', () => {
  it('returns only champion when fewer than three members scored', () => {
    const honors = computeMatchHonors(
      input({
        events: [
          event('ada', 40, '2026-11-02T10:00:00.000Z'),
          event('bee', 20, '2026-11-02T11:00:00.000Z'),
        ],
        attempts: [
          attempt('ada', 40, 60, '2026-11-02T10:00:00.000Z'),
          attempt('bee', 20, 60, '2026-11-02T11:00:00.000Z'),
        ],
      }),
    );

    expect(honors.map((row) => row.kind)).toEqual(['champion']);
    expect(honors[0]?.userId).toBe('ada');
  });

  it('awards Comeback King for the largest midpoint-to-final rank gain', () => {
    const honors = computeMatchHonors(
      input({
        events: [
          // Mid: ada 1, bee 2, cam 3, dee 4
          event('ada', 100, '2026-11-02T10:00:00.000Z'),
          event('bee', 80, '2026-11-02T11:00:00.000Z'),
          event('cam', 60, '2026-11-02T12:00:00.000Z'),
          event('dee', 20, '2026-11-02T13:00:00.000Z'),
          // Final: dee surges to 2nd
          event('dee', 150, '2026-11-06T10:00:00.000Z'),
          event('bee', 40, '2026-11-06T11:00:00.000Z'),
          event('cam', 10, '2026-11-06T12:00:00.000Z'),
        ],
        attempts: [
          attempt('ada', 100, 90, '2026-11-02T10:00:00.000Z'),
          attempt('bee', 80, 90, '2026-11-02T11:00:00.000Z'),
          attempt('cam', 60, 90, '2026-11-02T12:00:00.000Z'),
          attempt('dee', 20, 90, '2026-11-02T13:00:00.000Z'),
          attempt('dee', 150, 90, '2026-11-06T10:00:00.000Z'),
          attempt('bee', 40, 90, '2026-11-06T11:00:00.000Z'),
          attempt('cam', 10, 90, '2026-11-06T12:00:00.000Z'),
        ],
      }),
    );

    const comeback = honors.find((row) => row.kind === 'comeback');
    expect(comeback?.userId).toBe('dee');
    expect(comeback?.title).toBe('Comeback King!');
    expect(comeback?.proof).toContain('→');
  });

  it('excludes late accepts from Comeback King', () => {
    const honors = computeMatchHonors(
      input({
        acceptedAtByUser: accepted({
          ada: '2026-11-01T00:00:00.000Z',
          bee: '2026-11-01T00:00:00.000Z',
          cam: '2026-11-01T00:00:00.000Z',
          // After midpoint
          dee: '2026-11-06T00:00:00.000Z',
        }),
        events: [
          event('ada', 100, '2026-11-02T10:00:00.000Z'),
          event('bee', 80, '2026-11-02T11:00:00.000Z'),
          event('cam', 60, '2026-11-02T12:00:00.000Z'),
          event('dee', 200, '2026-11-06T10:00:00.000Z'),
        ],
        attempts: [
          attempt('ada', 100, 60, '2026-11-02T10:00:00.000Z'),
          attempt('bee', 80, 60, '2026-11-02T11:00:00.000Z'),
          attempt('cam', 60, 60, '2026-11-02T12:00:00.000Z'),
          attempt('dee', 200, 60, '2026-11-06T10:00:00.000Z'),
        ],
      }),
    );

    expect(honors.find((row) => row.kind === 'comeback')).toBeUndefined();
    expect(honors.find((row) => row.kind === 'champion')?.userId).toBe('dee');
  });

  it('skips best_set under best_single scoring', () => {
    const honors = computeMatchHonors(
      input({
        rules: { scoringMode: 'best_single', metric: 'pushups' },
        events: [
          event('ada', 40, '2026-11-02T10:00:00.000Z'),
          event('bee', 50, '2026-11-02T11:00:00.000Z'),
          event('cam', 30, '2026-11-02T12:00:00.000Z'),
        ],
        attempts: [
          attempt('ada', 40, 40, '2026-11-02T10:00:00.000Z'),
          attempt('bee', 50, 40, '2026-11-02T11:00:00.000Z'),
          attempt('cam', 30, 20, '2026-11-02T12:00:00.000Z'),
        ],
      }),
    );

    expect(honors.find((row) => row.kind === 'best_set')).toBeUndefined();
    expect(honors.find((row) => row.kind === 'fastest_set')?.title).toBe('Fastest set!');
  });

  it('does not award fastest set for attempts under the floor', () => {
    const honors = computeMatchHonors(
      input({
        events: [
          event('ada', 40, '2026-11-02T10:00:00.000Z'),
          event('bee', 30, '2026-11-02T11:00:00.000Z'),
          event('cam', 20, '2026-11-02T12:00:00.000Z'),
        ],
        attempts: [
          attempt('ada', 40, 80, '2026-11-02T10:00:00.000Z'),
          attempt('bee', 5, 1, '2026-11-02T11:00:00.000Z'),
          attempt('cam', 20, 40, '2026-11-02T12:00:00.000Z'),
        ],
      }),
    );

    const fastest = honors.find((row) => row.kind === 'fastest_set');
    expect(fastest?.userId).not.toBe('bee');
  });

  it('awards photo finish to the non-winner on a tied score', () => {
    const honors = computeMatchHonors(
      input({
        rules: { scoringMode: 'best_single', metric: 'pushups' },
        events: [
          event('ada', 50, '2026-11-02T10:00:00.000Z'),
          event('bee', 50, '2026-11-03T10:00:00.000Z'),
          event('cam', 20, '2026-11-03T11:00:00.000Z'),
        ],
        attempts: [
          attempt('ada', 50, 60, '2026-11-02T10:00:00.000Z'),
          attempt('bee', 50, 60, '2026-11-03T10:00:00.000Z'),
          attempt('cam', 20, 60, '2026-11-03T11:00:00.000Z'),
        ],
      }),
    );

    expect(honors.find((row) => row.kind === 'champion')?.userId).toBe('ada');
    expect(honors.find((row) => row.kind === 'photo_finish')?.userId).toBe('bee');
  });
});

describe('primaryHonorTitleFor', () => {
  it('prefers comeback over champion for the same viewer', () => {
    const honors = computeMatchHonors(
      input({
        events: [
          event('ada', 100, '2026-11-02T10:00:00.000Z'),
          event('bee', 20, '2026-11-02T11:00:00.000Z'),
          event('cam', 10, '2026-11-02T12:00:00.000Z'),
          event('bee', 200, '2026-11-06T10:00:00.000Z'),
        ],
        attempts: [
          attempt('ada', 100, 60, '2026-11-02T10:00:00.000Z'),
          attempt('bee', 20, 60, '2026-11-02T11:00:00.000Z'),
          attempt('cam', 10, 60, '2026-11-02T12:00:00.000Z'),
          attempt('bee', 200, 60, '2026-11-06T10:00:00.000Z'),
        ],
      }),
    );

    expect(primaryHonorTitleFor(honors, 'bee')).toBe('Comeback King!');
  });
});

// Silence unused MID in case of future assertions
void MID;
