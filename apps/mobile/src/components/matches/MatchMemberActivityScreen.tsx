import type { MatchMemberAttempt, MatchMetric } from '@product/client';
import { useQuery } from '@tanstack/react-query';
import { type Href, useRouter } from 'expo-router';
import {
  DECK_KIND_BY_METRIC,
  DeckDisc,
  DeckListRow,
  DeckNoteCard,
  DeckPageNav,
  DeckRowAmount,
  DeckSectionTitle,
} from '@/components/deck';
import { ACTIVITY_COPY } from '@/components/challenges/constants/doing-copy';
import {
  historyDayLabel,
  historyTimeLabel,
  timesLabel,
} from '@/components/challenges/history-weeks';
import { ScreenLoader } from '@/components/feedback';
import { apiClient } from '@/lib/api';
import { goBackOrHome } from '@/lib/go-back';
import { GroupPage } from './GroupPage';
import { BOARD_COPY, GROUPS_COPY } from './match-copy';
import { formatMatchMetricScore } from './match-metric';

type MatchMemberActivityScreenProps = {
  matchId: string;
  userId: string;
};

/**
 * One member's sets in this contest — same list language as day / challenge
 * history. Each row opens the set detail; play marks a clip posted to the group.
 */
export function MatchMemberActivityScreen({ matchId, userId }: MatchMemberActivityScreenProps) {
  const router = useRouter();
  const activityQuery = useQuery({
    queryKey: ['matches', matchId, 'members', userId, 'activity'],
    queryFn: () => apiClient.listMatchMemberActivity({ matchId, userId }),
  });
  const matchQuery = useQuery({
    queryKey: ['matches', 'detail', matchId],
    queryFn: () => apiClient.getMatch({ matchId }),
  });

  const back = () => goBackOrHome(`/matches/${matchId}`);

  if (activityQuery.isPending) {
    return <ScreenLoader testID="match-member-activity-loading" />;
  }

  if (activityQuery.isError || !activityQuery.data) {
    return (
      <GroupPage
        nav={<DeckPageNav onBack={back} />}
        testID="match-member-activity-missing"
      >
        <DeckNoteCard
          action={{ label: GROUPS_COPY.tryAgain, onPress: () => void activityQuery.refetch() }}
          body={GROUPS_COPY.loadFailedBody}
          glyph="offline"
          title={BOARD_COPY.memberActivityFailed}
        />
      </GroupPage>
    );
  }

  const { displayName, attempts } = activityQuery.data;
  const metric = matchQuery.data?.metric ?? null;
  const now = new Date();

  return (
    <GroupPage
      nav={<DeckPageNav onBack={back} title={displayName} />}
      onPullRefresh={async () => {
        await Promise.all([activityQuery.refetch(), matchQuery.refetch()]);
      }}
      testID="match-member-activity-screen"
    >
      <DeckSectionTitle
        corner={attempts.length > 0 ? timesLabel(attempts.length) : null}
        isFirst
        label={BOARD_COPY.memberAttempts}
      />
      {attempts.length === 0 ? (
        <DeckNoteCard
          body={BOARD_COPY.memberAttemptsEmpty}
          glyph="clock"
          isOutlined
          testID="match-member-attempts-empty"
          title={BOARD_COPY.memberAttempts}
        />
      ) : (
        attempts.map((attempt, index) => (
          <MemberAttemptRow
            attempt={attempt}
            isFirst={index === 0}
            key={attempt.attemptId}
            metric={metric}
            now={now}
            onOpen={
              hasPostedClip(attempt)
                ? () =>
                    router.push({
                      pathname: '/matches/[matchId]/member/[userId]/[attemptId]',
                      params: { matchId, userId, attemptId: attempt.attemptId },
                    } as unknown as Href)
                : undefined
            }
          />
        ))
      )}
    </GroupPage>
  );
}

/** The detail page leads with the clip, so a set without one has nothing to open. */
function hasPostedClip(attempt: MatchMemberAttempt): boolean {
  return attempt.proofClip != null;
}

function MemberAttemptRow({
  attempt,
  metric,
  isFirst,
  now,
  onOpen,
}: {
  attempt: MatchMemberAttempt;
  metric: MatchMetric | null;
  isFirst: boolean;
  now: Date;
  /** Absent when there is no clip — the list already shows count and time. */
  onOpen?: () => void;
}) {
  const hasClip = hasPostedClip(attempt);
  const kind = metric ? (DECK_KIND_BY_METRIC[metric] ?? null) : null;
  const amount =
    metric != null ? formatMatchMetricScore(metric, attempt.count) : String(attempt.count);

  return (
    <DeckListRow
      accessibilityHint={hasClip ? ACTIVITY_COPY.openWithClipHint : undefined}
      isFirst={isFirst}
      leading={<DeckDisc glyph={hasClip ? 'play' : undefined} kind={kind} />}
      meta={historyTimeLabel(attempt.performedAt)}
      onPress={onOpen}
      testID={`match-member-attempt-${attempt.attemptId}`}
      title={historyDayLabel(attempt.performedAt, now)}
      trailing={<DeckRowAmount text={amount} />}
    />
  );
}
