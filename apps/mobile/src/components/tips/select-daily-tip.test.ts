import { healthTips } from './constants/health-tips';
import type { HealthTip } from './constants/health-tips';
import {
  preferredEnrollmentTips,
  selectDailyTip,
  tipsForCategories,
} from './select-daily-tip';

const benefitPushups: HealthTip = {
  id: 'benefit-pushups',
  category: 'general',
  title: 'Why a short strength set matters',
  body: 'Muscle-strengthening counts.',
  challengeSlug: 'twenty-push-ups',
  activityKey: 'pushups',
  source: 'WHO physical activity',
};

const catalog = [...healthTips, benefitPushups];

describe('tipsForCategories', () => {
  it('puts your conditions first, then everyday tips, in catalog order', () => {
    const tips = tipsForCategories(healthTips, ['hypertension']);
    const categories = [...new Set(tips.map((tip) => tip.category))];

    expect(categories).toEqual(['hypertension', 'general']);
  });
});

describe('preferredEnrollmentTips', () => {
  it('prefers challenge slug over activity key', () => {
    const preferred = preferredEnrollmentTips(catalog, {
      challengeSlugs: ['twenty-push-ups'],
      activityKeys: ['walk'],
    });

    expect(preferred.map((tip) => tip.id)).toEqual(['benefit-pushups']);
  });

  it('falls back to activity key when no slug matches', () => {
    const preferred = preferredEnrollmentTips(catalog, {
      challengeSlugs: ['unknown'],
      activityKeys: ['pushups'],
    });

    expect(preferred.map((tip) => tip.id)).toEqual(['benefit-pushups']);
  });
});

describe('selectDailyTip', () => {
  it('gives the same tip all day and a different one the next', () => {
    const today = selectDailyTip(healthTips, ['hypertension'], '2026-10-22');

    expect(selectDailyTip(healthTips, ['hypertension'], '2026-10-22')).toEqual(today);
    expect(selectDailyTip(healthTips, ['hypertension'], '2026-10-23')).not.toEqual(today);
  });

  it('prefers an enrolled benefit tip over category rotation', () => {
    const tip = selectDailyTip(catalog, ['general'], '2026-10-22', {
      challengeSlugs: ['twenty-push-ups'],
      activityKeys: ['pushups'],
    });

    expect(tip?.id).toBe('benefit-pushups');
  });
});
