import { Redirect, useLocalSearchParams } from 'expo-router';
import { SplashScreen } from '@/components/auth';
import { LogVitalsScreen } from '@/components/challenges';
import { useSession } from '@/lib/auth-client';

export default function LogVitalsRoute() {
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

  return <LogVitalsScreen challengeId={challengeId} />;
}
