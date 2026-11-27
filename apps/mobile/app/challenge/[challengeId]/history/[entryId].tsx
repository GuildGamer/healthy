import { Redirect, useLocalSearchParams } from 'expo-router';
import { challengesTabHref } from '@/lib/challenges-tab';
import { ScreenLoader } from '@/components/feedback';
import { ChallengeHistoryEntryScreen } from '@/components/challenges';
import { useSession } from '@/lib/auth-client';

export default function ChallengeHistoryEntryRoute() {
  const { data: session, isPending } = useSession();
  const { challengeId, entryId } = useLocalSearchParams<{ challengeId: string; entryId: string }>();

  if (isPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!challengeId || !entryId) {
    return <Redirect href={challengesTabHref('mine')} />;
  }

  return <ChallengeHistoryEntryScreen challengeId={challengeId} entryId={entryId} />;
}
