import { Redirect } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { ChallengesScreen } from '@/components/challenges';
import { useSession } from '@/lib/auth-client';

export default function ChallengesTab() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <ChallengesScreen />;
}
