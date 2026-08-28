import type { IconName } from '@/components/forms';

export interface HealthCategory {
  id: string;
  name: string;
  icon: IconName;
}

export const healthCategories: readonly HealthCategory[] = [
  { id: 'hypertension', name: 'Hypertension', icon: 'heart' },
  { id: 'diabetes', name: 'Diabetes', icon: 'activity' },
  { id: 'asthma', name: 'Asthma', icon: 'wind' },
  { id: 'general', name: 'General Health', icon: 'plus' },
];
