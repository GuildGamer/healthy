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
    description: 'Earn points for completing daily challenges.',
  },
  {
    icon: 'gift',
    title: 'Stay ahead',
    description: 'Stay ahead of chronic illnesses like hypertension and diabetes.',
  },
];
