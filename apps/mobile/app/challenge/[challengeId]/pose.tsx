import { Redirect, useLocalSearchParams } from 'expo-router';
import { challengesTabHref } from '@/lib/challenges-tab';
import { ScreenLoader } from '@/components/feedback';
import { PoseSessionScreen } from '@/components/challenges/PoseSessionScreen';
import { useSession } from '@/lib/auth-client';

export default function ChallengePoseRoute() {
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

  return <PoseSessionScreen challengeId={challengeId} mode="challenge" />;
}
