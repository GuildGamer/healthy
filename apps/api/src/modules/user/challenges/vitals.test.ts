import { ORPCError } from '@orpc/server';
import { describe, expect, it } from 'vitest';
import { requireVitalsFor } from './vitals.js';

describe('requireVitalsFor', () => {
  it('does not require a reading for a check-in challenge', () => {
    expect(requireVitalsFor('check_in', undefined)).toBeNull();
  });

  it('requires a reading for a blood-pressure challenge', () => {
    expect(() => requireVitalsFor('vitals_bp', undefined)).toThrow(ORPCError);
  });

  it('accepts a plausible reading', () => {
    expect(
      requireVitalsFor('vitals_bp', { systolic: 120, diastolic: 80 }),
    ).toEqual({ systolic: 120, diastolic: 80 });
  });

  it('rejects an implausible reading', () => {
    expect(() =>
      requireVitalsFor('vitals_bp', { systolic: 10, diastolic: 80 }),
    ).toThrow(/plausible range/);
  });
});
