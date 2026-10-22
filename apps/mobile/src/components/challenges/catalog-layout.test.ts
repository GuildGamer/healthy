import {
  addedToastMessage,
  catalogCategoryOrder,
  catalogSections,
  isMembersOnly,
  membershipBoxBody,
  otherMembersOnlyCount,
  pickCatalogSuggestions,
  rewardCornerLabel,
} from './catalog-layout';
import { catalogChallenge } from './testing/catalog-fixtures';

const catalog = [
  catalogChallenge({ challengeId: 'bp', category: 'hypertension', sortOrder: 1 }),
  catalogChallenge({ challengeId: 'salt', category: 'hypertension', sortOrder: 2 }),
  catalogChallenge({
    challengeId: 'clinic',
    category: 'hypertension',
    sortOrder: 3,
    isLocked: true,
    requiresMembership: true,
  }),
  catalogChallenge({ challengeId: 'walk', category: 'general', sortOrder: 1 }),
  catalogChallenge({ challengeId: 'water', category: 'general', sortOrder: 2, isEnrolled: true }),
  catalogChallenge({ challengeId: 'inhaler', category: 'asthma', sortOrder: 1 }),
];

describe('catalogue layout', () => {
  it('suggests from your conditions, never locked and never already yours', () => {
    const suggestions = pickCatalogSuggestions(catalog, ['hypertension']);

    expect(suggestions.map((challenge) => challenge.challengeId)).toEqual(['bp', 'salt']);
  });

  it('orders categories with your conditions first, only when they have challenges', () => {
    expect(catalogCategoryOrder(catalog, ['asthma'])).toEqual([
      'asthma',
      'general',
      'hypertension',
    ]);
  });

  it('lists everything else to add once, leaving out suggestions and your own', () => {
    const order = catalogCategoryOrder(catalog, ['hypertension']);
    const suggested = pickCatalogSuggestions(catalog, ['hypertension']);
    const sections = catalogSections(catalog, 'all', order, suggested);

    expect(
      sections.map((section) => [
        section.category,
        section.challenges.map((item) => item.challengeId),
      ]),
    ).toEqual([
      ['hypertension', ['clinic']],
      ['general', ['walk']],
      ['asthma', ['inhaler']],
    ]);
  });

  it('brings suggestions back into the list once you filter to a category', () => {
    const order = catalogCategoryOrder(catalog, ['hypertension']);
    const sections = catalogSections(catalog, 'hypertension', order, []);

    expect(sections).toHaveLength(1);
    expect(sections[0]?.challenges.map((item) => item.challengeId)).toEqual([
      'bp',
      'salt',
      'clinic',
    ]);
  });

  it('finds nothing in a category where you already have everything', () => {
    const order = catalogCategoryOrder(catalog, []);
    const allMine = catalog.map((challenge) => ({ ...challenge, isEnrolled: true }));

    expect(catalogSections(allMine, 'general', order, [])).toEqual([]);
  });

  it('tags members-only challenges you could not add, and counts what membership opens', () => {
    expect(isMembersOnly({ isLocked: true, isEnrolled: false })).toBe(true);
    expect(isMembersOnly({ isLocked: true, isEnrolled: true })).toBe(false);
    expect(otherMembersOnlyCount(catalog, 'clinic')).toBe(0);
    expect(otherMembersOnlyCount(catalog, 'bp')).toBe(1);
    expect(membershipBoxBody(14)).toMatch(/^Along with 14 other challenges/);
    expect(membershipBoxBody(1)).toMatch(/^Along with 1 other challenge,/);
  });

  it('says what a challenge is worth and where it went', () => {
    expect(rewardCornerLabel(150, 'daily')).toBe('+150 a day');
    expect(rewardCornerLabel(300, 'weekly')).toBe('+300 a week');
    expect(addedToastMessage('daily')).toBe('Added to today');
    expect(addedToastMessage('monthly')).toBe('Added to this month');
  });
});
