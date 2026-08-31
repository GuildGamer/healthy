import { Redirect } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { HomeScreen } from '@/components/home';
import { useSession } from '@/lib/auth-client';

export default function HomeTab() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <HomeScreen />;
}
