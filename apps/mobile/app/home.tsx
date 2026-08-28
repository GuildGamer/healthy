import { Redirect } from 'expo-router';
import { SplashScreen } from '@/components/auth';
import { HomeScreen } from '@/components/HomeScreen';
import { useSession } from '@/lib/auth-client';

export default function Home() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <SplashScreen />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <HomeScreen />;
}
