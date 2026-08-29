import type { HealthCategory } from '@product/client';
import type { IconName } from '@/components/forms';

export interface HealthCategoryOption {
  id: HealthCategory;
  name: string;
  icon: IconName;
}

export const healthCategories: readonly HealthCategoryOption[] = [
  { id: 'hypertension', name: 'Hypertension', icon: 'heart' },
  { id: 'diabetes', name: 'Diabetes', icon: 'activity' },
  { id: 'asthma', name: 'Asthma', icon: 'wind' },
  { id: 'general', name: 'General Health', icon: 'plus' },
];
