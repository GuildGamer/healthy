import { Redirect } from 'expo-router';
import { SplashScreen } from '@/components/auth';
import { ChallengesScreen } from '@/components/challenges';
import { useSession } from '@/lib/auth-client';

export default function ChallengesTab() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <SplashScreen />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <ChallengesScreen />;
}
