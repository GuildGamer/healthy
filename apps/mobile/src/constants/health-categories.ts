import type { HealthCategory } from '@product/client';

export interface HealthCategoryOption {
  id: HealthCategory;
  name: string;
  /** One quiet line under the name on the onboarding picker. */
  line: string;
  /** Material Community Icons glyph, same pack as challenge marks. */
  mark: string;
}

export function healthCategoryName(category: HealthCategory): string {
  return (
    healthCategories.find((option) => option.id === category)?.name ??
    'Everyday health'
  );
}

export function healthCategoryMark(category: HealthCategory): string {
  return healthCategories.find((option) => option.id === category)?.mark ?? 'leaf';
}

export const healthCategories: readonly HealthCategoryOption[] = [
  {
    id: 'hypertension',
    name: 'Blood pressure',
    line: 'Readings, meds, clinic checks',
    mark: 'heart-pulse',
  },
  {
    id: 'diabetes',
    name: 'Blood sugar',
    line: 'Glucose, carbs, feet',
    mark: 'water-check',
  },
  {
    id: 'asthma',
    name: 'Breathing',
    line: 'Inhaler, peak flow',
    mark: 'lungs',
  },
  {
    id: 'general',
    name: 'Everyday health',
    line: 'Walk, water, sleep',
    mark: 'leaf',
  },
];
