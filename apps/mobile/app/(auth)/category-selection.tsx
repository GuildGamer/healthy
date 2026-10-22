import type { HealthCategory } from '@product/client';
import { useRouter } from 'expo-router';
import { ConditionPickerScreen } from '@/components/auth';
import { apiClient } from '@/lib/api';
import { resolvePostAuthHref } from '@/lib/resolve-post-auth';

export default function CategorySelection() {
  const router = useRouter();

  async function saveCategories(categories: readonly HealthCategory[]) {
    await apiClient.updateCategories({ categories: [...categories] });
    const href = await resolvePostAuthHref();
    router.replace(href ?? '/(tabs)');
  }

  return <ConditionPickerScreen onSubmit={saveCategories} submitLabel="Continue" />;
}
