import { Redirect } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { ManageCategoriesScreen } from '@/components/profile';
import { useSession } from '@/lib/auth-client';

export default function HealthCategoriesRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <ManageCategoriesScreen />;
}
