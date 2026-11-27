import { isReviewerMembershipEmail } from './reviewer-membership.js';

/**
 * Stored paid membership cache, or the hard-coded App Store reviewer allowlist.
 * Staging tester grants are checked separately (async, staging-only).
 */
export function effectiveMembershipActive(
  stored: boolean | null | undefined,
  email?: string | null,
): boolean {
  if (isReviewerMembershipEmail(email)) {
    return true;
  }

  return stored ?? false;
}
