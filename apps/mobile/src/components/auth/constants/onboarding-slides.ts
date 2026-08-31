export type OnboardingArt = 'habits' | 'points' | 'ahead';

export interface OnboardingSlide {
  id: string;
  art: OnboardingArt;
  title: string;
  description: string;
}

export const onboardingSlides: readonly OnboardingSlide[] = [
  {
    id: 'habits',
    art: 'habits',
    title: 'Small wins, every day',
    description:
      'Short challenges matched to blood pressure, blood sugar, breathing, or everyday health.',
  },
  {
    id: 'points',
    art: 'points',
    title: 'Progress you can feel',
    description:
      'Finish a challenge, earn points, and watch a quiet streak grow, without turning care into a grind.',
  },
  {
    id: 'ahead',
    art: 'ahead',
    title: 'Stay a step ahead',
    description:
      'Gentle habits that help you stay ahead of hypertension, diabetes, and asthma, on your terms.',
  },
];

/** Auto-advance interval for the unauthenticated carousel. */
export const ONBOARDING_AUTO_MS = 4200;
