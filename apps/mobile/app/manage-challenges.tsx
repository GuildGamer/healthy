import { Redirect } from 'expo-router';
import { SplashScreen } from '@/components/auth';
import { ManageChallengesScreen } from '@/components/challenges';
import { useSession } from '@/lib/auth-client';

export default function ManageChallengesRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <SplashScreen />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <ManageChallengesScreen />;
}
