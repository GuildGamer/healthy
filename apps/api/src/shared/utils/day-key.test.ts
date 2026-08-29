import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TIME_ZONE,
  dayKeyFor,
  isValidTimeZone,
  previousDayKey,
} from './day-key.js';

describe('day-key', () => {
  it('formats the local calendar day as YYYY-MM-DD', () => {
    const lateEveningUtc = new Date('2026-08-28T22:30:00.000Z');

    expect(dayKeyFor('UTC', lateEveningUtc)).toBe('2026-08-28');
  });

  it('rolls the day over at local midnight, not UTC midnight', () => {
    // 22:30 UTC is already the 29th in Singapore (UTC+8).
    const lateEveningUtc = new Date('2026-08-28T22:30:00.000Z');

    expect(dayKeyFor('Asia/Singapore', lateEveningUtc)).toBe('2026-08-29');
    expect(dayKeyFor('America/New_York', lateEveningUtc)).toBe('2026-08-28');
  });

  it('falls back to UTC for an unrecognised zone rather than throwing', () => {
    const at = new Date('2026-08-28T22:30:00.000Z');

    expect(dayKeyFor('Mars/Olympus_Mons', at)).toBe(dayKeyFor(DEFAULT_TIME_ZONE, at));
  });

  it('recognises valid and invalid zones', () => {
    expect(isValidTimeZone('Europe/London')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus_Mons')).toBe(false);
  });

  it('steps back a day across a month boundary', () => {
    expect(previousDayKey('2026-09-01')).toBe('2026-08-31');
    expect(previousDayKey('2026-01-01')).toBe('2025-12-31');
  });
});
