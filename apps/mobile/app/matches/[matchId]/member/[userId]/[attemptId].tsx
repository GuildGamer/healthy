import { Redirect, useLocalSearchParams } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { MatchMemberAttemptScreen } from '@/components/matches/MatchMemberAttemptScreen';
import { useSession } from '@/lib/auth-client';

export default function MatchMemberAttemptRoute() {
  const { data: session, isPending } = useSession();
  const { matchId, userId, attemptId } = useLocalSearchParams<{
    matchId: string;
    userId: string;
    attemptId: string;
  }>();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!matchId || !userId || !attemptId) {
    return <Redirect href="/(tabs)/challenges" />;
  }

  return (
    <MatchMemberAttemptScreen attemptId={attemptId} matchId={matchId} userId={userId} />
  );
}
