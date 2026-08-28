import type { IconName } from '@/components/forms';

export interface OnboardingSlide {
  icon: IconName;
  title: string;
  description: string;
}

export const onboardingSlides: readonly OnboardingSlide[] = [
  {
    icon: 'heart',
    title: 'Build healthy habits',
    description: 'Build healthy habits through daily challenges tailored to your condition.',
  },
  {
    icon: 'award',
    title: 'Earn points',
    description: 'Earn points and redeem for airtime or data bundles.',
  },
  {
    icon: 'gift',
    title: 'Stay ahead',
    description: 'Stay ahead of chronic illnesses like hypertension and diabetes.',
  },
];
