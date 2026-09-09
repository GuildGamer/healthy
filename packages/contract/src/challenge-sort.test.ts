import { describe, expect, it } from 'vitest';
import {
  compareChallengeCatalogOrder,
  compareChallengeSortOrder,
} from './challenge-sort.js';

describe('compareChallengeSortOrder', () => {
  it('ranks lower sortOrder first', () => {
    expect(
      compareChallengeSortOrder({ sortOrder: 0 }, { sortOrder: 100 }),
    ).toBeLessThan(0);
  });
});

describe('compareChallengeCatalogOrder', () => {
  it('falls back to title when sortOrder matches', () => {
    expect(
      compareChallengeCatalogOrder(
        { sortOrder: 10, title: 'Beta' },
        { sortOrder: 10, title: 'Alpha' },
      ),
    ).toBeGreaterThan(0);
  });
});
