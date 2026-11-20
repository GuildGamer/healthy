import { findBenefitTip } from './find-benefit-tip';
import type { HealthTip } from './constants/health-tips';

const tips: HealthTip[] = [
  {
    id: 'benefit-walk',
    category: 'general',
    title: 'Why a walk matters',
    body: 'A short walk adds aerobic minutes.',
    challengeSlug: 'ten-minute-walk',
    activityKey: 'walk',
    source: 'WHO',
  },
  {
    id: 'benefit-pushups',
    category: 'general',
    title: 'Why push-ups matter',
    body: 'Strength counts.',
    challengeSlug: 'twenty-push-ups',
    activityKey: 'pushups',
  },
];

describe('findBenefitTip', () => {
  it('matches challenge slug first', () => {
    expect(
      findBenefitTip(tips, {
        challengeSlug: 'twenty-push-ups',
        activityKey: 'walk',
      })?.id,
    ).toBe('benefit-pushups');
  });

  it('falls back to activity key', () => {
    expect(findBenefitTip(tips, { activityKey: 'walk' })?.id).toBe('benefit-walk');
  });

  it('returns null when nothing matches', () => {
    expect(findBenefitTip(tips, { challengeSlug: 'none', activityKey: 'none' })).toBeNull();
  });
});
