import type { MatchMemberAttempt, MatchMetric } from '@product/client';
import { useQuery } from '@tanstack/react-query';
import {
  type ActivityDetail,
  ActivityDetailScreen,
} from '@/components/challenges/ActivityDetailScreen';
import { apiClient } from '@/lib/api';
import { formatClockTime } from '@/lib/clock-time';
import { goBackOrHome } from '@/lib/go-back';
import { BOARD_COPY } from './match-copy';
import { formatMatchMetricScore } from './match-metric';

type MatchMemberAttemptScreenProps = {
  matchId: string;
  userId: string;
  attemptId: string;
};

/**
 * One member's set, opened from their contest activity list — same detail
 * language as History (clip leads when they posted it to the group).
 */
export function MatchMemberAttemptScreen({
  matchId,
  userId,
  attemptId,
}: MatchMemberAttemptScreenProps) {
  const activityQuery = useQuery({
    queryKey: ['matches', matchId, 'members', userId, 'activity'],
    queryFn: () => apiClient.listMatchMemberActivity({ matchId, userId }),
  });
  const matchQuery = useQuery({
    queryKey: ['matches', 'detail', matchId],
    queryFn: () => apiClient.getMatch({ matchId }),
  });

  const attempt = activityQuery.data?.attempts.find((row) => row.attemptId === attemptId);
  const displayName = activityQuery.data?.displayName ?? '';
  const metric = matchQuery.data?.metric ?? null;
  const isPending = activityQuery.isPending || (Boolean(attempt) && matchQuery.isPending);

  return (
    <ActivityDetailScreen
      detail={
        attempt && !isPending ? memberAttemptDetail(attempt, displayName, metric) : undefined
      }
      isPending={isPending}
      onBack={() => goBackOrHome(`/matches/${matchId}/member/${userId}`)}
      onRefresh={async () => {
        await Promise.all([activityQuery.refetch(), matchQuery.refetch()]);
      }}
    />
  );
}

function memberAttemptDetail(
  attempt: MatchMemberAttempt,
  displayName: string,
  metric: MatchMetric | null,
): ActivityDetail {
  const amount =
    metric != null ? formatMatchMetricScore(metric, attempt.count) : String(attempt.count);
  const when = formatClockTime(new Date(attempt.performedAt));

  return {
    title: displayName || BOARD_COPY.memberAttempts,
    amount,
    when,
    points: null,
    proofClip: attempt.proofClip ?? null,
    userChallengeId: null,
    shareCard: null,
  };
}
