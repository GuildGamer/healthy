import { Redirect } from 'expo-router';
import { SplashScreen } from '@/components/auth';
import { ActivityScreen } from '@/components/activity';
import { useSession } from '@/lib/auth-client';

export default function ActivityTab() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <SplashScreen />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <ActivityScreen />;
}
