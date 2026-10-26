import type { ChallengeHistoryEntry } from '@product/client';
import { goBackOrHome } from '@/lib/go-back';
import { type ActivityDetail, ActivityDetailScreen } from './ActivityDetailScreen';
import { historyLogCopy } from './challenge-history';
import {
  type CompletionChallenge,
  historyCompletionShareRoute,
  posterForHistoryEntry,
} from './completion-poster';
import { historyDayLabel, historyTimeLabel } from './history-weeks';
import { useChallengeHistory } from './useChallengeHistory';

/** One finish from a challenge's own history. */
export function ChallengeHistoryEntryScreen({
  challengeId,
  entryId,
}: {
  challengeId: string;
  entryId: string;
}) {
  const { historyQuery, entries, challenge } = useChallengeHistory(challengeId);
  const entry = entries.find((item) => item.id === entryId);

  return (
    <ActivityDetailScreen
      detail={entry ? historyEntryDetail(entry, challenge) : undefined}
      isPending={historyQuery.isPending && !entry}
      onBack={() => goBackOrHome(`/challenge/${challengeId}/history`)}
      onRefresh={() => historyQuery.refetch()}
    />
  );
}

function historyEntryDetail(
  entry: ChallengeHistoryEntry,
  challenge: CompletionChallenge | null,
): ActivityDetail {
  return {
    title: posterForHistoryEntry(entry, challenge).label,
    amount: historyLogCopy(entry.log),
    when: `${historyDayLabel(entry.completedAt, new Date())} · ${historyTimeLabel(entry.completedAt)}`,
    points: entry.pointsDelta,
    proofClip: entry.proofClip,
    userChallengeId: entry.id,
    shareCard: historyCompletionShareRoute(entry, challenge),
  };
}
