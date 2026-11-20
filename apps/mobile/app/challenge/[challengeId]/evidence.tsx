import { Redirect, useLocalSearchParams } from 'expo-router';
import { challengesTabHref } from '@/lib/challenges-tab';
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
    return <Redirect href={challengesTabHref('mine')} />;
  }

  return <LogEvidenceScreen challengeId={challengeId} />;
}
