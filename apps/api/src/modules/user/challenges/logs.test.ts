import { describe, expect, it } from 'vitest';
import { ORPCError } from '@orpc/server';
import { emptyChallengeTarget } from '@product/contract';
import { requireLogFor, requireSleepLogFor } from './logs.js';

const sleepCapture = {
  kind: 'structured_log' as const,
  metric: 'sleep' as const,
  target: emptyChallengeTarget,
};

const checkInCapture = {
  kind: 'self_report' as const,
  metric: null,
  target: emptyChallengeTarget,
};

const lastNight = {
  wentToBedAt: '2026-10-22T23:00:00+01:00',
  wokeUpAt: '2026-10-23T07:00:00+01:00',
  rested: 4,
};

describe('requireLogFor', () => {
  it('rejects a glucose challenge without a reading', () => {
    expect(() => requireLogFor('glucose', {})).toThrow(ORPCError);
  });

  it('accepts a plausible glucose reading', () => {
    expect(
      requireLogFor('glucose', {
        glucose: { mmolL: 5.4, context: 'fasting' },
      }),
    ).toEqual({
      kind: 'glucose',
      fields: { mmolL: 5.4, context: 'fasting' },
    });
  });

  it('ignores log payloads on a check-in', () => {
    expect(requireLogFor('check_in', { water: { amount: 4, unit: 'glasses' } })).toBeNull();
  });
});

describe('requireSleepLogFor', () => {
  const now = new Date('2026-10-23T10:00:00+01:00');

  it('returns null when no sleep entry is sent, including on a sleep challenge', () => {
    expect(requireSleepLogFor(sleepCapture, undefined, now)).toBeNull();
    expect(requireSleepLogFor(checkInCapture, undefined, now)).toBeNull();
  });

  it('rejects a sleep entry on a challenge that is not about sleep', () => {
    expect(() => requireSleepLogFor(checkInCapture, lastNight, now)).toThrow(ORPCError);
  });

  it('accepts last night’s sleep on a sleep challenge', () => {
    expect(requireSleepLogFor(sleepCapture, lastNight, now)).toEqual({
      kind: 'sleep',
      fields: lastNight,
    });
  });

  it('rejects a wake time in the future', () => {
    expect(() =>
      requireSleepLogFor(
        sleepCapture,
        {
          wentToBedAt: '2026-10-23T09:00:00+01:00',
          wokeUpAt: '2026-10-23T11:00:00+01:00',
        },
        now,
      ),
    ).toThrow(/future/);
  });

  it('rejects a wake time older than thirty-six hours', () => {
    expect(() =>
      requireSleepLogFor(
        sleepCapture,
        {
          wentToBedAt: '2026-10-20T23:00:00+01:00',
          wokeUpAt: '2026-10-21T07:00:00+01:00',
        },
        now,
      ),
    ).toThrow(/too old/);
  });
});
