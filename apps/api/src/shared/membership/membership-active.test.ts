import { describe, expect, it } from 'vitest';
import { effectiveMembershipActive } from './membership-active.js';

describe('effectiveMembershipActive', () => {
  it('uses the stored flag', () => {
    expect(effectiveMembershipActive(false)).toBe(false);
    expect(effectiveMembershipActive(null)).toBe(false);
    expect(effectiveMembershipActive(true)).toBe(true);
  });

  it('keeps store reviewers as members regardless of the stored flag', () => {
    expect(
      effectiveMembershipActive(false, 'roosterdotcom@gmail.com'),
    ).toBe(true);
    expect(
      effectiveMembershipActive(false, ' RoosterDotCom@gmail.com '),
    ).toBe(true);
    expect(effectiveMembershipActive(false, 'someone@else.com')).toBe(false);
  });
});
