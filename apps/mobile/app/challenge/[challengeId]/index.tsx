import { Redirect, useLocalSearchParams } from 'expo-router';
import { SplashScreen } from '@/components/auth';
import { ChallengeDetailScreen } from '@/components/challenges';
import { useSession } from '@/lib/auth-client';

export default function ChallengeDetailRoute() {
  const { data: session, isPending } = useSession();
  const { challengeId } = useLocalSearchParams<{ challengeId: string }>();

  if (isPending) {
    return <SplashScreen />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!challengeId) {
    return <Redirect href="/(tabs)/challenges" />;
  }

  return <ChallengeDetailScreen challengeId={challengeId} />;
}
