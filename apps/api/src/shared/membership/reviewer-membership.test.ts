import { describe, expect, it } from 'vitest';
import { isReviewerMembershipEmail } from './reviewer-membership.js';

describe('isReviewerMembershipEmail', () => {
  it('matches the store reviewer allowlist case-insensitively', () => {
    expect(isReviewerMembershipEmail('roosterdotcom@gmail.com')).toBe(true);
    expect(isReviewerMembershipEmail(' RoosterDotCom@gmail.com ')).toBe(true);
  });

  it('rejects other emails and empty values', () => {
    expect(isReviewerMembershipEmail('someone@else.com')).toBe(false);
    expect(isReviewerMembershipEmail('')).toBe(false);
    expect(isReviewerMembershipEmail(null)).toBe(false);
    expect(isReviewerMembershipEmail(undefined)).toBe(false);
  });
});
