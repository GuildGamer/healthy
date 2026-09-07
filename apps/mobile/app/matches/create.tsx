import { Redirect } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { MatchCreateScreen } from '@/components/matches/MatchCreateScreen';
import { useSession } from '@/lib/auth-client';

export default function MatchCreateRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <MatchCreateScreen />;
}
