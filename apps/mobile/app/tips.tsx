import { Redirect } from 'expo-router';
import { SplashScreen } from '@/components/auth';
import { TipsScreen } from '@/components/tips';
import { useSession } from '@/lib/auth-client';

export default function TipsRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <SplashScreen />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <TipsScreen />;
}
