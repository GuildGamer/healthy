import { describe, expect, it } from 'vitest';
import { recordPracticeSessionInputSchema } from './practice.js';

const base = {
  durationSeconds: 252,
  startedAt: '2026-10-22T08:00:00.000Z',
  endedAt: '2026-10-22T08:04:12.000Z',
  externalId: 'session-1',
};

describe('recordPracticeSessionInputSchema', () => {
  it('takes a push-up set with its reps, and a walk measured in time', () => {
    expect(
      recordPracticeSessionInputSchema.safeParse({
        ...base,
        metric: 'pushups',
        source: 'in_app_pose',
        count: 14,
      }).success,
    ).toBe(true);
    expect(
      recordPracticeSessionInputSchema.safeParse({
        ...base,
        metric: 'walk',
        source: 'in_app_gps',
        distanceMeters: 380,
      }).success,
    ).toBe(true);
  });

  it('refuses a session from a sensor that cannot measure it', () => {
    expect(
      recordPracticeSessionInputSchema.safeParse({ ...base, metric: 'walk', source: 'in_app_pose' })
        .success,
    ).toBe(false);
  });

  it('refuses a push-up set without reps and a walk without time', () => {
    expect(
      recordPracticeSessionInputSchema.safeParse({
        ...base,
        metric: 'pushups',
        source: 'in_app_pose',
      }).success,
    ).toBe(false);
    expect(
      recordPracticeSessionInputSchema.safeParse({
        ...base,
        metric: 'walk',
        source: 'in_app_gps',
        durationSeconds: 0,
      }).success,
    ).toBe(false);
  });
});
