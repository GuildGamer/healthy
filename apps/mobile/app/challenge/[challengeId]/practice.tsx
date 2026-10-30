import { useQuery } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { PoseSessionScreen } from '@/components/challenges/PoseSessionScreen';
import { openPoseContestRoute } from '@/components/challenges/open-pose-contest';
import { ScreenLoader } from '@/components/feedback';
import { apiClient } from '@/lib/api';
import { useSession } from '@/lib/auth-client';
import { challengesTabHref } from '@/lib/challenges-tab';

/**
 * Free sets after the daily challenge is done. When an open group contest
 * scores this exercise, the set belongs there instead of practice.
 */
export default function ChallengePracticeRoute() {
  const { data: session, isPending } = useSession();
  const { challengeId } = useLocalSearchParams<{ challengeId: string }>();
  const todayQuery = useQuery({
    queryKey: ['challenges', 'today'],
    queryFn: () => apiClient.listTodayChallenges(),
    enabled: Boolean(session),
  });
  const matchesQuery = useQuery({
    queryKey: ['matches', 'mine'],
    queryFn: () => apiClient.listMyMatches(),
    enabled: Boolean(session),
  });

  if (isPending || !challengeId) {
    return isPending ? <ScreenLoader /> : <Redirect href={challengesTabHref('mine')} />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (todayQuery.isPending || matchesQuery.isPending) {
    return <ScreenLoader />;
  }

  const occurrence = todayQuery.data?.challenges.find(
    (item: { challengeId: string }) => item.challengeId === challengeId,
  );
  const contestRoute = openPoseContestRoute(
    matchesQuery.data?.live ?? [],
    occurrence?.capture?.metric,
  );
  if (contestRoute) {
    return <Redirect href={contestRoute} />;
  }

  return <PoseSessionScreen challengeId={challengeId} mode="practice" />;
}
