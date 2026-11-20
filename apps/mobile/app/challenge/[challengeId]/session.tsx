import { Redirect, useLocalSearchParams } from 'expo-router';
import { challengesTabHref } from '@/lib/challenges-tab';
import { ScreenLoader } from '@/components/feedback';
import { ChallengeSessionScreen } from '@/components/challenges/ChallengeSessionScreen';
import { useSession } from '@/lib/auth-client';

export default function ChallengeSessionRoute() {
  const { data: session, isPending } = useSession();
  const { challengeId, autoStart } = useLocalSearchParams<{
    challengeId: string;
    autoStart?: string;
  }>();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!challengeId) {
    return <Redirect href={challengesTabHref('mine')} />;
  }

  return (
    <ChallengeSessionScreen
      autoStart={autoStart === '1'}
      challengeId={challengeId}
    />
  );
}
