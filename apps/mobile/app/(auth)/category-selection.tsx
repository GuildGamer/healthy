import type { HealthCategory } from '@product/client';
import { useRouter } from 'expo-router';
import { CategorySelectionScreen } from '@/components/auth';
import { apiClient } from '@/lib/api';
import { resolvePostAuthHref } from '@/lib/resolve-post-auth';

export default function CategorySelection() {
  const router = useRouter();

  async function handleContinue(categories: readonly HealthCategory[]) {
    await apiClient.updateCategories({
      categories: [...categories],
    });
    const href = await resolvePostAuthHref();
    router.replace(href ?? '/(tabs)');
  }

  return <CategorySelectionScreen onContinue={handleContinue} />;
}
