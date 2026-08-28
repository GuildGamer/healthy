import { Redirect } from 'expo-router';
import { SplashScreen } from '@/components/auth';
import { HomeScreen } from '@/components/home';
import { useSession } from '@/lib/auth-client';

export default function HomeTab() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <SplashScreen />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <HomeScreen />;
}
