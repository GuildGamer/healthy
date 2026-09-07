import { Redirect, useLocalSearchParams } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { MatchBoardScreen } from '@/components/matches/MatchBoardScreen';
import { useSession } from '@/lib/auth-client';

export default function MatchBoardRoute() {
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

  return <MatchBoardScreen matchId={matchId} />;
}
