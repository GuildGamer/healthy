import type { HealthCategory } from '@product/client';
import { healthTips, type HealthTip } from './constants/health-tips';

const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * Condition-specific tips first, then general ones, mirroring how the API picks
 * challenges: a user's categories plus `general`, or everything when they have
 * not chosen yet.
 */
export function tipsForCategories(
  categories: readonly HealthCategory[],
): HealthTip[] {
  if (categories.length === 0) {
    return [...healthTips];
  }

  const chosen = healthTips.filter((tip) => categories.includes(tip.category));
  const general = healthTips.filter(
    (tip) => tip.category === 'general' && !categories.includes('general'),
  );

  return [...chosen, ...general];
}

/**
 * Rotates through the relevant tips by UTC day so the home preview is stable
 * for the whole day and lines up with the challenge day key.
 */
export function selectDailyTip(
  categories: readonly HealthCategory[],
  dayKey: string,
): HealthTip | null {
  const relevant = tipsForCategories(categories);
  if (relevant.length === 0) {
    return null;
  }

  const timestamp = Date.parse(`${dayKey}T00:00:00.000Z`);
  if (Number.isNaN(timestamp)) {
    return relevant[0] ?? null;
  }

  const dayNumber = Math.floor(timestamp / MILLISECONDS_PER_DAY);
  return relevant[dayNumber % relevant.length] ?? null;
}
