/**
 * Store reviewers who must always have paid membership, independent of
 * MEMBERSHIP_BYPASS and of App Store / Play billing.
 *
 * Keep this list short and intentional — each entry is a permanent unlock.
 */
const REVIEWER_MEMBERSHIP_EMAILS = new Set([
  'roosterdotcom@gmail.com',
]);

export function isReviewerMembershipEmail(
  email: string | null | undefined,
): boolean {
  if (!email) {
    return false;
  }

  return REVIEWER_MEMBERSHIP_EMAILS.has(email.trim().toLowerCase());
}
