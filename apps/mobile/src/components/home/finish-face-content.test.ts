import type { ChallengeFinish } from '@/lib/challenge-finish-session';
import { finishFaceContent, isShareWorthy } from './finish-face-content';
import { todayChallenge } from './testing/today-fixtures';

function finish(overrides: Partial<ChallengeFinish>): ChallengeFinish {
  return {
    challenge: todayChallenge({ title: 'Stretch before bed' }),
    outcome: { kind: 'checkedIn' },
    pointsAwarded: 100,
    penaltyApplied: 0,
    currentStreakDays: 3,
    finishedAt: Date.parse('2026-10-22T08:10:00'),
    ...overrides,
  };
}

describe('finishFaceContent', () => {
  it('says a check-in is done, with what it was and the points', () => {
    const content = finishFaceContent(finish({}), 'mobility');

    expect(content.headline).toEqual({
      kind: 'word',
      word: 'Done.',
      sub: 'Stretch before bed · +100 points',
    });
    expect(content.poster).toBeNull();
  });

  it('shows a reading as logged and when, never the numbers', () => {
    const content = finishFaceContent(
      finish({ outcome: { kind: 'logged', loggedAt: '2026-10-22T08:10:00' }, pointsAwarded: 150 }),
      'bloodPressure',
    );

    expect(content.headline).toEqual({
      kind: 'word',
      word: 'Logged.',
      sub: 'Reading saved at 08:10 · +150 points',
    });
    expect(content.poster).toBeNull();
  });

  it('puts the reps in big type, says how they were counted, and offers a poster', () => {
    const content = finishFaceContent(
      finish({
        challenge: todayChallenge({
          title: 'Do 20 push-ups',
          capture: {
            kind: 'device_session',
            metric: 'pushups',
            target: { durationMinutes: null, distanceMeters: null, count: 20 },
          },
        }),
        outcome: { kind: 'reps', count: 22, durationSeconds: 41 },
        pointsAwarded: 150,
      }),
      'strength',
    );

    expect(content.headline).toEqual({ kind: 'measure', value: '22', of: 'push-ups in 41 s' });
    expect(content.proof).toEqual({
      glyph: 'camera',
      line: 'Counted by your camera · +150 points',
    });
    expect(content.poster).toEqual({
      kind: 'strength',
      label: 'Push-ups',
      value: '22',
      unit: 'push-ups, counted by camera',
    });
  });

  it('names squats and plank from the challenge metric', () => {
    const squats = finishFaceContent(
      finish({
        challenge: todayChallenge({
          title: 'Do 50 squats',
          capture: {
            kind: 'device_session',
            metric: 'squats',
            target: { durationMinutes: null, distanceMeters: null, count: 50 },
          },
        }),
        outcome: { kind: 'reps', count: 50, durationSeconds: 90 },
        pointsAwarded: 150,
      }),
      'gym',
    );
    expect(squats.headline).toEqual({ kind: 'measure', value: '50', of: 'squats in 90 s' });
    expect(squats.poster).toEqual({
      kind: 'gym',
      label: 'Squats',
      value: '50',
      unit: 'squats, counted by camera',
    });

    const plank = finishFaceContent(
      finish({
        challenge: todayChallenge({
          title: 'Hold a plank',
          capture: {
            kind: 'device_session',
            metric: 'plank',
            target: { durationMinutes: null, distanceMeters: null, count: 60 },
          },
        }),
        outcome: { kind: 'reps', count: 60, durationSeconds: 60 },
        pointsAwarded: 150,
      }),
      'mobility',
    );
    expect(plank.headline).toEqual({ kind: 'measure', value: '60', of: 'seconds in 60 s' });
    expect(plank.poster).toMatchObject({
      label: 'Plank',
      unit: 'seconds, counted by camera',
    });
  });

  it('labels an extra set and says plainly it earns nothing', () => {
    const content = finishFaceContent(
      finish({
        challenge: todayChallenge({
          capture: {
            kind: 'device_session',
            metric: 'squats',
            target: { durationMinutes: null, distanceMeters: null, count: 20 },
          },
        }),
        outcome: { kind: 'extraSet', count: 15 },
        pointsAwarded: 0,
      }),
      'strength',
    );

    expect(content.eyebrowLabel).toBe('Extra set');
    expect(content.headline).toEqual({ kind: 'measure', value: '15', of: 'more squats' });
    expect(content.proof?.line).toBe('Saved to your history · no points');
  });

  it('owns up to a photo check that cost points', () => {
    const content = finishFaceContent(
      finish({
        outcome: { kind: 'logged', loggedAt: '2026-10-22T08:10:00' },
        pointsAwarded: 0,
        penaltyApplied: 25,
      }),
      'bloodPressure',
    );

    expect(content.headline).toMatchObject({ sub: 'Reading saved at 08:10 · −25 points' });
  });
});

describe('isShareWorthy', () => {
  it('offers sharing for reps, walks and gym photos only', () => {
    expect(isShareWorthy({ kind: 'walk', durationSeconds: 600, distanceMeters: 900 })).toBe(true);
    expect(isShareWorthy({ kind: 'photo' })).toBe(true);
    expect(isShareWorthy({ kind: 'water', glasses: 8 })).toBe(false);
    expect(isShareWorthy({ kind: 'logged', loggedAt: '2026-10-22T08:10:00' })).toBe(false);
  });
});
