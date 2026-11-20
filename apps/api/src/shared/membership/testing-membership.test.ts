import { afterEach, describe, expect, it } from 'vitest';
import { effectiveMembershipActive } from './testing-membership.js';

const ORIGINAL = process.env.MEMBERSHIP_BYPASS;

afterEach(() => {
  if (ORIGINAL === undefined) {
    delete process.env.MEMBERSHIP_BYPASS;
    return;
  }

  process.env.MEMBERSHIP_BYPASS = ORIGINAL;
});

describe('effectiveMembershipActive', () => {
  it('treats every account as a member during the testing grant', () => {
    process.env.MEMBERSHIP_BYPASS = '1';

    expect(effectiveMembershipActive(false)).toBe(true);
    expect(effectiveMembershipActive(null)).toBe(true);
  });

  it('uses the stored flag once the testing grant is off', () => {
    process.env.MEMBERSHIP_BYPASS = '0';

    expect(effectiveMembershipActive(false)).toBe(false);
    expect(effectiveMembershipActive(true)).toBe(true);
  });
});
