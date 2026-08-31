import type { CatalogChallenge, HealthCategory } from '@product/client';
import { healthCategoryName } from '@/constants/health-categories';

export type CatalogScope = 'all' | 'on' | 'off';

export type CatalogBrowseTab = 'on' | 'off';

export type CatalogCategoryFilter = HealthCategory | 'all';


export type CatalogCategoryGroup = {
  category: HealthCategory;
  challenges: CatalogChallenge[];
};

export type CatalogEnrollmentCounts = {
  total: number;
  on: number;
  off: number;
};

/** Stable product order for category sections. */
export const CATALOG_CATEGORY_ORDER: readonly HealthCategory[] = [
  'hypertension',
  'diabetes',
  'asthma',
  'general',
];

/** Add first — people open this screen to find challenges, not audit the list. */
export function defaultCatalogBrowseTab(): CatalogBrowseTab {
  return 'off';
}

/** Open on one category so the first paint is a short list, not the whole catalog. */
export function defaultCatalogCategoryFilter(
  available: readonly HealthCategory[],
): CatalogCategoryFilter {
  return available[0] ?? 'all';
}

export function labelForCatalogCategory(
  category: CatalogCategoryFilter,
): string {
  return category === 'all' ? 'All categories' : healthCategoryName(category);
}

export function catalogEnrollmentCounts(
  challenges: readonly CatalogChallenge[],
): CatalogEnrollmentCounts {
  let on = 0;

  for (const challenge of challenges) {
    if (challenge.isEnrolled) {
      on += 1;
    }
  }

  return {
    total: challenges.length,
    on,
    off: challenges.length - on,
  };
}

export function filterCatalogChallenges(
  challenges: readonly CatalogChallenge[],
  scope: CatalogScope,
  category: CatalogCategoryFilter,
): CatalogChallenge[] {
  return challenges.filter((challenge) => {
    if (scope === 'on' && !challenge.isEnrolled) {
      return false;
    }

    if (scope === 'off' && challenge.isEnrolled) {
      return false;
    }

    if (category !== 'all' && challenge.category !== category) {
      return false;
    }

    return true;
  });
}

/**
 * Groups filtered challenges into category buckets in product order.
 * Empty categories are omitted.
 */
export function groupCatalogByCategory(
  challenges: readonly CatalogChallenge[],
  categoryOrder: readonly HealthCategory[] = CATALOG_CATEGORY_ORDER,
): CatalogCategoryGroup[] {
  const byCategory = new Map<HealthCategory, CatalogChallenge[]>();

  for (const challenge of challenges) {
    const bucket = byCategory.get(challenge.category);
    if (bucket) {
      bucket.push(challenge);
      continue;
    }

    byCategory.set(challenge.category, [challenge]);
  }

  const groups: CatalogCategoryGroup[] = [];

  for (const category of categoryOrder) {
    const bucket = byCategory.get(category);
    if (!bucket || bucket.length === 0) {
      continue;
    }

    groups.push({ category, challenges: bucket });
  }

  for (const [category, bucket] of byCategory) {
    if (categoryOrder.includes(category)) {
      continue;
    }

    groups.push({ category, challenges: bucket });
  }

  return groups;
}

/** Categories that still have rows after the current scope filter. */
export function categoriesPresentInScope(
  challenges: readonly CatalogChallenge[],
  scope: CatalogScope,
  categoryOrder: readonly HealthCategory[] = CATALOG_CATEGORY_ORDER,
): HealthCategory[] {
  const scoped = filterCatalogChallenges(challenges, scope, 'all');
  const present = new Set(scoped.map((challenge) => challenge.category));

  return categoryOrder.filter((category) => present.has(category));
}

/** Keep a category filter only while that category still has rows in scope. */
export function resolveCatalogCategoryFilter(
  selected: CatalogCategoryFilter,
  available: readonly HealthCategory[],
): CatalogCategoryFilter {
  if (selected === 'all') {
    return 'all';
  }

  if (available.includes(selected)) {
    return selected;
  }

  return defaultCatalogCategoryFilter(available);
}

export function countChallengesInCategory(
  challenges: readonly CatalogChallenge[],
  scope: CatalogScope,
  category: HealthCategory,
): number {
  return filterCatalogChallenges(challenges, scope, category).length;
}
