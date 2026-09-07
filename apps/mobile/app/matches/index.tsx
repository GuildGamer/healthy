import { Redirect } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { MatchesListScreen } from '@/components/matches/MatchesListScreen';
import { useSession } from '@/lib/auth-client';

export default function MatchesRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <MatchesListScreen />;
}
