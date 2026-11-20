import type { MatchListItem } from '@product/client';
import { isPoseMetric } from '@product/contract/match-board';
import { practiceRoute } from './practice-entry';

/**
 * An open contest that scores every pose set (best single or cumulative).
 * Streak contests score finished days, so another set does not belong there.
 */
export function openPoseContest(
  live: readonly MatchListItem[],
  metric: string | null | undefined,
): MatchListItem | null {
  if (!metric || !isPoseMetric(metric)) {
    return null;
  }

  return (
    live.find(
      (match) =>
        match.status === 'open' &&
        match.metric === metric &&
        match.scoringMode !== 'days_completed',
    ) ?? null
  );
}

export function openPoseContestRoute(
  live: readonly MatchListItem[],
  metric: string | null | undefined,
): `/matches/${string}/pose` | null {
  const match = openPoseContest(live, metric);
  return match ? `/matches/${match.id}/pose` : null;
}

/**
 * After the daily target is done, another set goes to the open group contest
 * when one is live for that exercise. Only then does it fall back to practice.
 */
export function anotherSetRoute(
  challengeId: string,
  metric: string | null | undefined,
  live: readonly MatchListItem[],
): `/matches/${string}/pose` | `/challenge/${string}/practice` {
  return openPoseContestRoute(live, metric) ?? practiceRoute(challengeId);
}
