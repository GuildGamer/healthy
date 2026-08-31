import { Redirect, useLocalSearchParams } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { ChallengeSessionScreen } from '@/components/challenges/ChallengeSessionScreen';
import { useSession } from '@/lib/auth-client';

export default function ChallengeSessionRoute() {
  const { data: session, isPending } = useSession();
  const { challengeId } = useLocalSearchParams<{ challengeId: string }>();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!challengeId) {
    return <Redirect href="/(tabs)/challenges" />;
  }

  return <ChallengeSessionScreen challengeId={challengeId} />;
}
