import type { HealthCategory } from '@product/client';
import type { HealthTip } from './constants/health-tips';

const MILLISECONDS_PER_DAY = 86_400_000;

/** Active enrollments used to prefer linked benefit tips on Home. */
export type TipEnrollmentPreference = {
  challengeSlugs: readonly string[];
  activityKeys: readonly string[];
};

/**
 * Fitness tips (`general`) first. When condition features are on, also include
 * tips matching the user's categories.
 */
export function tipsForCategories(
  tips: readonly HealthTip[],
  categories: readonly HealthCategory[],
): HealthTip[] {
  const general = tips.filter((tip) => tip.category === 'general');

  if (categories.length === 0) {
    return general.length > 0 ? general : [...tips];
  }

  const chosen = tips.filter(
    (tip) => tip.category !== 'general' && categories.includes(tip.category),
  );

  return [...chosen, ...general];
}

/**
 * Tips linked to the member's enrollments: challenge slug first, then activity key.
 */
export function preferredEnrollmentTips(
  tips: readonly HealthTip[],
  enrollment: TipEnrollmentPreference | null | undefined,
): HealthTip[] {
  if (!enrollment) {
    return [];
  }

  const slugSet = new Set(enrollment.challengeSlugs);
  const bySlug = tips.filter(
    (tip) => tip.challengeSlug != null && slugSet.has(tip.challengeSlug),
  );
  if (bySlug.length > 0) {
    return bySlug;
  }

  const activitySet = new Set(enrollment.activityKeys);
  return tips.filter(
    (tip) => tip.activityKey != null && activitySet.has(tip.activityKey),
  );
}

/**
 * Rotates through the relevant tips by UTC day so the home preview is stable
 * for the whole day and lines up with the challenge day key.
 * When enrollments link to benefit tips, those tips are preferred.
 */
export function selectDailyTip(
  tips: readonly HealthTip[],
  categories: readonly HealthCategory[],
  dayKey: string,
  enrollment?: TipEnrollmentPreference | null,
): HealthTip | null {
  const relevant = tipsForCategories(tips, categories);
  if (relevant.length === 0) {
    return null;
  }

  const preferred = preferredEnrollmentTips(relevant, enrollment);
  const pool = preferred.length > 0 ? preferred : relevant;

  const timestamp = Date.parse(`${dayKey}T00:00:00.000Z`);
  if (Number.isNaN(timestamp)) {
    return pool[0] ?? null;
  }

  const dayNumber = Math.floor(timestamp / MILLISECONDS_PER_DAY);
  return pool[dayNumber % pool.length] ?? null;
}
