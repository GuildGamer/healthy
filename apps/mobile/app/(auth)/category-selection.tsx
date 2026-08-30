import type { HealthCategory } from '@product/client';
import { useRouter } from 'expo-router';
import { CategorySelectionScreen } from '@/components/auth';
import { apiClient } from '@/lib/api';

export default function CategorySelection() {
  const router = useRouter();

  async function handleContinue(categories: readonly HealthCategory[]) {
    await apiClient.updateCategories({
      categories: [...categories],
    });
    router.replace('/verify-email');
  }

  return <CategorySelectionScreen onContinue={handleContinue} />;
}
