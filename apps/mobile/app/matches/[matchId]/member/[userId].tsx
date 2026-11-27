import { Redirect, useLocalSearchParams } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { MatchMemberActivityScreen } from '@/components/matches/MatchMemberActivityScreen';
import { useSession } from '@/lib/auth-client';

export default function MatchMemberActivityRoute() {
  const { data: session, isPending } = useSession();
  const { matchId, userId } = useLocalSearchParams<{ matchId: string; userId: string }>();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!matchId || !userId) {
    return <Redirect href="/(tabs)/challenges" />;
  }

  return <MatchMemberActivityScreen matchId={matchId} userId={userId} />;
}
