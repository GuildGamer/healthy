import type { HealthTip } from './constants/health-tips';

/** Resolve a "Why it matters" tip for a challenge or activity. */
export function findBenefitTip(
  tips: readonly HealthTip[],
  match: {
    challengeSlug?: string | null;
    activityKey?: string | null;
  },
): HealthTip | null {
  if (match.challengeSlug) {
    const bySlug = tips.find((tip) => tip.challengeSlug === match.challengeSlug);
    if (bySlug) {
      return bySlug;
    }
  }

  if (match.activityKey) {
    return tips.find((tip) => tip.activityKey === match.activityKey) ?? null;
  }

  return null;
}
