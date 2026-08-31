import type { CatalogChallenge, HealthCategory } from '@product/client';
import {
  CATALOG_CATEGORY_ORDER,
  catalogEnrollmentCounts,
  categoriesPresentInScope,
  countChallengesInCategory,
  defaultCatalogBrowseTab,
  defaultCatalogCategoryFilter,
  filterCatalogChallenges,
  groupCatalogByCategory,
  resolveCatalogCategoryFilter,
} from './manage-catalog-layout';

function challenge(
  overrides: Partial<CatalogChallenge> &
    Pick<CatalogChallenge, 'challengeId' | 'category' | 'isEnrolled'>,
): CatalogChallenge {
  return {
    slug: overrides.challengeId,
    title: overrides.title ?? overrides.challengeId,
    description: 'desc',
    rewardPoints: 10,
    frequency: 'daily',
    completionKind: 'check_in',
    instruction: 'Do it',
    icon: 'heart-pulse',
    reminders: [],
    capture: {
      kind: 'self_report',
      metric: null,
      target: { durationMinutes: null, distanceMeters: null, count: null },
    },
    ...overrides,
  };
}

describe('defaultCatalogBrowseTab', () => {
  it('opens Add so the first thing to do is find challenges', () => {
    expect(defaultCatalogBrowseTab()).toBe('off');
  });
});

describe('defaultCatalogCategoryFilter', () => {
  it('opens the first category so the list starts short', () => {
    expect(
      defaultCatalogCategoryFilter(['hypertension', 'diabetes']),
    ).toBe('hypertension');
  });

  it('falls back to all when nothing is available', () => {
    expect(defaultCatalogCategoryFilter([])).toBe('all');
  });
});

describe('resolveCatalogCategoryFilter', () => {
  it('keeps a category that is still available', () => {
    expect(
      resolveCatalogCategoryFilter('diabetes', ['hypertension', 'diabetes']),
    ).toBe('diabetes');
  });

  it('falls back to the first available category when the selection left', () => {
    expect(resolveCatalogCategoryFilter('asthma', ['general'])).toBe('general');
  });
});

describe('countChallengesInCategory', () => {
  it('counts rows for one category inside a scope', () => {
    const catalog = [
      challenge({ challengeId: 'bp', category: 'hypertension', isEnrolled: true }),
      challenge({
        challengeId: 'bp2',
        category: 'hypertension',
        isEnrolled: false,
      }),
      challenge({ challengeId: 'walk', category: 'general', isEnrolled: false }),
    ];

    expect(countChallengesInCategory(catalog, 'off', 'hypertension')).toBe(1);
    expect(countChallengesInCategory(catalog, 'all', 'hypertension')).toBe(2);
  });
});

describe('catalogEnrollmentCounts', () => {
  it('counts on and off', () => {
    const counts = catalogEnrollmentCounts([
      challenge({ challengeId: 'a', category: 'general', isEnrolled: true }),
      challenge({ challengeId: 'b', category: 'diabetes', isEnrolled: false }),
      challenge({ challengeId: 'c', category: 'asthma', isEnrolled: true }),
    ]);

    expect(counts).toEqual({ total: 3, on: 2, off: 1 });
  });
});

describe('filterCatalogChallenges', () => {
  const catalog = [
    challenge({ challengeId: 'bp', category: 'hypertension', isEnrolled: true }),
    challenge({ challengeId: 'sugar', category: 'diabetes', isEnrolled: false }),
    challenge({ challengeId: 'walk', category: 'general', isEnrolled: false }),
  ];

  it('filters by enrollment scope', () => {
    expect(
      filterCatalogChallenges(catalog, 'on', 'all').map((item) => item.challengeId),
    ).toEqual(['bp']);
    expect(
      filterCatalogChallenges(catalog, 'off', 'all').map((item) => item.challengeId),
    ).toEqual(['sugar', 'walk']);
  });

  it('filters by category within a scope', () => {
    expect(
      filterCatalogChallenges(catalog, 'off', 'general').map(
        (item) => item.challengeId,
      ),
    ).toEqual(['walk']);
  });
});

describe('groupCatalogByCategory', () => {
  it('groups in product order even when input is shuffled', () => {
    const groups = groupCatalogByCategory([
      challenge({ challengeId: 'walk', category: 'general', isEnrolled: false }),
      challenge({ challengeId: 'bp', category: 'hypertension', isEnrolled: true }),
      challenge({
        challengeId: 'sugar',
        category: 'diabetes',
        isEnrolled: false,
      }),
      challenge({
        challengeId: 'bp2',
        category: 'hypertension',
        isEnrolled: false,
      }),
    ]);

    expect(groups.map((group) => group.category)).toEqual([
      'hypertension',
      'diabetes',
      'general',
    ]);
    expect(groups[0]?.challenges.map((item) => item.challengeId)).toEqual([
      'bp',
      'bp2',
    ]);
  });
});

describe('categoriesPresentInScope', () => {
  it('lists categories that still have rows for the scope', () => {
    const catalog = [
      challenge({ challengeId: 'bp', category: 'hypertension', isEnrolled: true }),
      challenge({ challengeId: 'walk', category: 'general', isEnrolled: false }),
    ];

    expect(categoriesPresentInScope(catalog, 'on')).toEqual([
      'hypertension',
    ] satisfies HealthCategory[]);
    expect(categoriesPresentInScope(catalog, 'all')).toEqual([
      'hypertension',
      'general',
    ]);
    expect(categoriesPresentInScope(catalog, 'all')).toEqual(
      CATALOG_CATEGORY_ORDER.filter(
        (category) => category === 'hypertension' || category === 'general',
      ),
    );
  });
});
