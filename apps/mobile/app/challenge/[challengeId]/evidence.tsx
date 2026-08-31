import { Redirect, useLocalSearchParams } from 'expo-router';
import { ScreenLoader } from '@/components/feedback';
import { LogEvidenceScreen } from '@/components/challenges';
import { useSession } from '@/lib/auth-client';

export default function LogEvidenceRoute() {
  const { data: session, isPending } = useSession();
  const { challengeId } = useLocalSearchParams<{ challengeId: string }>();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!challengeId) {
    return <Redirect href="/(tabs)/challenges" />;
  }

  return <LogEvidenceScreen challengeId={challengeId} />;
}
