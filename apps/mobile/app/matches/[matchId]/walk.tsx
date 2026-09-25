import { Redirect, useLocalSearchParams } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { MatchWalkScreen } from '@/components/matches';
import { useSession } from '@/lib/auth-client';

export default function MatchWalkRoute() {
  const { data: session, isPending } = useSession();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!matchId) {
    return <Redirect href="/matches" />;
  }

  return <MatchWalkScreen matchId={matchId} />;
}
