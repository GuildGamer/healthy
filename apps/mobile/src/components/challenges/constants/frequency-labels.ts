import type { ChallengeFrequency } from '@product/client';

export const frequencyOptions: ChallengeFrequency[] = [
  'daily',
  'weekly',
  'monthly',
];

export const frequencyLabel: Record<ChallengeFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

/** Shown next to an occurrence so a weekly item is not mistaken for today's work. */
export const frequencyBadge: Record<ChallengeFrequency, string> = {
  daily: 'Today',
  weekly: 'This week',
  monthly: 'This month',
};
