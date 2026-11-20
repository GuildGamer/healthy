import { describe, expect, it } from 'vitest';
import { challengeSleepSchema } from './challenge-logging';

function sleep(input: {
  wentToBedAt: string;
  wokeUpAt: string;
  rested?: number;
}) {
  return challengeSleepSchema.safeParse(input);
}

describe('challengeSleepSchema', () => {
  it('accepts a night that crosses midnight with an optional rested rating', () => {
    const result = sleep({
      wentToBedAt: '2026-10-22T23:00:00+01:00',
      wokeUpAt: '2026-10-23T07:00:00+01:00',
      rested: 4,
    });

    expect(result.success).toBe(true);
  });

  it('rejects a wake time before bedtime', () => {
    const result = sleep({
      wentToBedAt: '2026-10-23T08:00:00+01:00',
      wokeUpAt: '2026-10-23T07:00:00+01:00',
    });

    expect(result.success).toBe(false);
  });

  it('rejects sleep shorter than one hour', () => {
    const result = sleep({
      wentToBedAt: '2026-10-23T06:30:00+01:00',
      wokeUpAt: '2026-10-23T07:00:00+01:00',
    });

    expect(result.success).toBe(false);
  });

  it('rejects sleep longer than sixteen hours', () => {
    const result = sleep({
      wentToBedAt: '2026-10-22T12:00:00+01:00',
      wokeUpAt: '2026-10-23T05:00:00+01:00',
    });

    expect(result.success).toBe(false);
  });
});
