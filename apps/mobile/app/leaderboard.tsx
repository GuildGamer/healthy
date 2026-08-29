import { Redirect } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { LeaderboardScreen } from '@/components/leaderboard';
import { useSession } from '@/lib/auth-client';

export default function LeaderboardRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <LeaderboardScreen />;
}
