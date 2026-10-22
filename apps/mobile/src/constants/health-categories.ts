import type { HealthCategory } from '@product/client';
import type { GlyphName } from '@/components/icons';

export interface HealthCategoryOption {
  id: HealthCategory;
  name: string;
  /** One quiet line under the name on the onboarding picker. */
  line: string;
  /** Material Community Icons glyph, same pack as challenge marks. */
  mark: string;
  /** Healthy's own icon family, used on the condition picker. */
  glyph: GlyphName;
}

export function healthCategoryName(category: HealthCategory): string {
  return healthCategories.find((option) => option.id === category)?.name ?? 'Everyday health';
}

export function healthCategoryMark(category: HealthCategory): string {
  return healthCategories.find((option) => option.id === category)?.mark ?? 'leaf';
}

export const healthCategories: readonly HealthCategoryOption[] = [
  {
    id: 'general',
    name: 'Everyday health',
    line: 'Walk, water, sleep',
    mark: 'leaf',
    glyph: 'everydayHealth',
  },
  {
    id: 'hypertension',
    name: 'Blood pressure',
    line: 'Readings, meds, clinic checks',
    mark: 'heart-pulse',
    glyph: 'bloodPressure',
  },
  {
    id: 'diabetes',
    name: 'Blood sugar',
    line: 'Glucose, carbs, feet',
    mark: 'water-check',
    glyph: 'bloodSugar',
  },
  {
    id: 'asthma',
    name: 'Breathing',
    line: 'Inhaler, peak flow',
    mark: 'lungs',
    glyph: 'breathing',
  },
];
