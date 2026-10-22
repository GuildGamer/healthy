import { Redirect, useLocalSearchParams } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { MatchResultScreen } from '@/components/matches/MatchResultScreen';
import { useSession } from '@/lib/auth-client';

export default function MatchResultRoute() {
  const { data: session, isPending } = useSession();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!matchId) {
    return <Redirect href="/(tabs)/challenges" />;
  }

  return <MatchResultScreen matchId={matchId} />;
}
