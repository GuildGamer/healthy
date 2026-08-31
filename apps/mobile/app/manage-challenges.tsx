import { Redirect } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { ManageChallengesScreen } from '@/components/challenges';
import { useSession } from '@/lib/auth-client';

export default function ManageChallengesRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <ManageChallengesScreen />;
}
