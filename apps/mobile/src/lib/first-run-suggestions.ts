import type { CatalogChallenge, HealthCategory } from '@product/client';

export const FIRST_RUN_SUGGESTION_LIMIT = 2;

/**
 * Two challenges to add from an empty day: from the conditions you chose
 * first, then everyday ones, never anything locked behind membership.
 */
export function pickFirstRunSuggestions(
  catalog: readonly CatalogChallenge[],
  categories: readonly HealthCategory[],
): CatalogChallenge[] {
  const available = catalog.filter((challenge) => !challenge.isEnrolled && !challenge.isLocked);
  const chosen = available.filter((challenge) => categories.includes(challenge.category));
  const everyday = available.filter(
    (challenge) => challenge.category === 'general' && !categories.includes('general'),
  );

  return [...chosen, ...everyday].slice(0, FIRST_RUN_SUGGESTION_LIMIT);
}
