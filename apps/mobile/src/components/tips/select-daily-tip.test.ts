import { healthTips } from './constants/health-tips';
import { groupTipsByCategory, tipsForCategories } from './select-daily-tip';

describe('groupTipsByCategory', () => {
  it('keeps catalog order and does not mix categories', () => {
    const tips = tipsForCategories(healthTips, ['hypertension', 'diabetes']);
    const groups = groupTipsByCategory(tips);

    expect(groups.map((group) => group.category)).toEqual([
      'hypertension',
      'diabetes',
      'general',
    ]);
    expect(groups[0]?.tips.every((tip) => tip.category === 'hypertension')).toBe(
      true,
    );
    expect(groups.at(-1)?.tips).toEqual(
      healthTips.filter((tip) => tip.category === 'general'),
    );
  });
});
