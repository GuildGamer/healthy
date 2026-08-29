import { Redirect } from 'expo-router';
import { SplashScreen } from '@/components/auth';
import { LeaderboardScreen } from '@/components/leaderboard';
import { useSession } from '@/lib/auth-client';

export default function LeaderboardRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <SplashScreen />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <LeaderboardScreen />;
}
