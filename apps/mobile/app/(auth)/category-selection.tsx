import type { HealthCategory } from '@product/client';
import { useRouter } from 'expo-router';
import { CategorySelectionScreen } from '@/components/auth';
import { apiClient } from '@/lib/api';
import { readEmailVerified } from '@/lib/auth-client';
import { routeAfterCategories } from '@/lib/post-auth-route';

export default function CategorySelection() {
  const router = useRouter();

  async function handleContinue(categories: readonly HealthCategory[]) {
    await apiClient.updateCategories({
      categories: [...categories],
    });
    const emailVerified = await readEmailVerified();
    router.replace(routeAfterCategories(emailVerified));
  }

  return <CategorySelectionScreen onContinue={handleContinue} />;
}
