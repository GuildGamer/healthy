import { describe, expect, it } from 'vitest';
import { addMembershipInterval, isEntitlementActive } from './period.js';

describe('addMembershipInterval', () => {
  it('adds one calendar month', () => {
    const from = new Date('2026-09-16T12:00:00.000Z');
    expect(addMembershipInterval(from, 'month').toISOString()).toBe(
      '2026-10-16T12:00:00.000Z',
    );
  });

  it('adds one calendar year', () => {
    const from = new Date('2026-09-16T12:00:00.000Z');
    expect(addMembershipInterval(from, 'year').toISOString()).toBe(
      '2027-09-16T12:00:00.000Z',
    );
  });

  it('clamps 31 January to the end of February', () => {
    const from = new Date('2026-01-31T08:00:00.000Z');
    expect(addMembershipInterval(from, 'month').toISOString()).toBe(
      '2026-02-28T08:00:00.000Z',
    );
  });
});

describe('isEntitlementActive', () => {
  const now = new Date('2026-09-16T12:00:00.000Z');

  it('treats a null end as still active', () => {
    expect(isEntitlementActive(null, now)).toBe(true);
  });

  it('treats a future end as active', () => {
    expect(isEntitlementActive(new Date('2026-10-16T12:00:00.000Z'), now)).toBe(
      true,
    );
  });

  it('treats a past end as inactive', () => {
    expect(isEntitlementActive(new Date('2026-09-16T11:59:59.000Z'), now)).toBe(
      false,
    );
  });
});
