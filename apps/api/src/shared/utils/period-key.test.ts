import { describe, expect, it } from 'vitest';
import { periodKeyFor, previousPeriodKey } from './period-key.js';

describe('periodKeyFor', () => {
  it('returns the local calendar day for daily challenges', () => {
    const at = new Date('2026-08-29T10:00:00.000Z');

    expect(periodKeyFor('daily', 'UTC', at)).toBe('2026-08-29');
  });

  it('follows the user zone across the day boundary', () => {
    // 23:30 UTC is already the next day in Tokyo and still the previous one in
    // Los Angeles, so the same instant belongs to three different days.
    const at = new Date('2026-08-29T23:30:00.000Z');

    expect(periodKeyFor('daily', 'Asia/Tokyo', at)).toBe('2026-08-30');
    expect(periodKeyFor('daily', 'UTC', at)).toBe('2026-08-29');
    expect(periodKeyFor('daily', 'America/Los_Angeles', at)).toBe('2026-08-29');
  });

  it('floors weekly challenges to the Monday of the local week', () => {
    // 2026-08-29 is a Saturday; its Monday is 2026-08-24.
    const saturday = new Date('2026-08-29T10:00:00.000Z');

    expect(periodKeyFor('weekly', 'UTC', saturday)).toBe('2026-08-24');
  });

  it('treats Monday as the start of its own week', () => {
    const monday = new Date('2026-08-24T10:00:00.000Z');

    expect(periodKeyFor('weekly', 'UTC', monday)).toBe('2026-08-24');
  });

  it('treats Sunday as the end of the week it opened', () => {
    const sunday = new Date('2026-08-30T10:00:00.000Z');

    expect(periodKeyFor('weekly', 'UTC', sunday)).toBe('2026-08-24');
  });


  it('crosses the month boundary when flooring a week', () => {
    // 2026-09-01 is a Tuesday, so its week opened in August.
    const tuesday = new Date('2026-09-01T10:00:00.000Z');

    expect(periodKeyFor('weekly', 'UTC', tuesday)).toBe('2026-08-31');
  });

  it('floors monthly challenges to the first of the local month', () => {
    const at = new Date('2026-08-29T10:00:00.000Z');

    expect(periodKeyFor('monthly', 'UTC', at)).toBe('2026-08-01');
  });

  it('uses the user zone when deciding which month a moment falls in', () => {
    // Still 31 August in Los Angeles, already 1 September in UTC.
    const at = new Date('2026-09-01T04:00:00.000Z');

    expect(periodKeyFor('monthly', 'UTC', at)).toBe('2026-09-01');
    expect(periodKeyFor('monthly', 'America/Los_Angeles', at)).toBe(
      '2026-08-01',
    );
  });
});

describe('previousPeriodKey', () => {
  it('steps back one day for daily', () => {
    expect(previousPeriodKey('daily', '2026-08-29')).toBe('2026-08-28');
  });


  it('steps back across a month boundary for daily', () => {
    expect(previousPeriodKey('daily', '2026-09-01')).toBe('2026-08-31');
  });

  it('steps back one week for weekly', () => {
    expect(previousPeriodKey('weekly', '2026-08-24')).toBe('2026-08-17');
  });

  it('steps back one month for monthly', () => {
    expect(previousPeriodKey('monthly', '2026-09-01')).toBe('2026-08-01');
  });

  it('steps back across a year boundary for monthly', () => {
    expect(previousPeriodKey('monthly', '2026-01-01')).toBe('2025-12-01');
  });
});
