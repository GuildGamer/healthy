import { groupTipsByCategory, tipsForCategories } from './select-daily-tip';
import {
  groupsForScope,
  labelForTipScope,
  resolveTipScope,
} from './tip-section-scope';

const groups = groupTipsByCategory(
  tipsForCategories(['hypertension', 'diabetes']),
);

describe('tip section scope', () => {
  it('names the all-tips scope without a category string', () => {
    expect(labelForTipScope('all')).toBe('All tips');
    expect(labelForTipScope('hypertension')).toBe('Blood pressure');
  });

  it('filters groups to one condition, or keeps them all', () => {
    expect(groupsForScope(groups, 'all')).toHaveLength(3);
    expect(groupsForScope(groups, 'diabetes').map((group) => group.category)).toEqual(
      ['diabetes'],
    );
  });

  it('falls back to all when the chosen section is gone', () => {
    expect(resolveTipScope('asthma', groups)).toBe('all');
    expect(resolveTipScope('diabetes', groups)).toBe('diabetes');
  });
});
