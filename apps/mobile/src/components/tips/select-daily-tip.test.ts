import { healthTips } from './constants/health-tips';
import { selectDailyTip, tipsForCategories } from './select-daily-tip';

describe('tipsForCategories', () => {
  it('puts your conditions first, then everyday tips, in catalog order', () => {
    const tips = tipsForCategories(healthTips, ['hypertension']);
    const categories = [...new Set(tips.map((tip) => tip.category))];

    expect(categories).toEqual(['hypertension', 'general']);
  });
});

describe('selectDailyTip', () => {
  it('gives the same tip all day and a different one the next', () => {
    const today = selectDailyTip(healthTips, ['hypertension'], '2026-10-22');

    expect(selectDailyTip(healthTips, ['hypertension'], '2026-10-22')).toEqual(today);
    expect(selectDailyTip(healthTips, ['hypertension'], '2026-10-23')).not.toEqual(today);
  });
});
