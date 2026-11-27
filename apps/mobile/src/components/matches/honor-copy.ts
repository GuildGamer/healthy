import type { MatchBoard, MatchHonor } from '@product/client';
import { groupTitle } from './group-today';

/** Contest label for posters: host title when set, otherwise activity-led fallback. */
export function honorChallengeTitle(board: MatchBoard): string | null {
  const hostTitle = board.hostTitle?.trim();
  if (hostTitle) {
    return hostTitle;
  }
  return null;
}

/** Meta line under the proof: "Push-ups · 7 days ended". */
export function honorMetaLine(board: MatchBoard): string {
  const days = Math.max(
    1,
    Math.round(
      (new Date(board.endsAt).getTime() - new Date(board.startsAt).getTime()) /
        (24 * 60 * 60 * 1000),
    ),
  );
  const activity =
    board.scoringMode === 'days_completed'
      ? 'Streak'
      : board.metric === 'pushups'
        ? 'Push-ups'
        : board.metric === 'walk'
          ? 'Walk'
          : board.metric.replace(/_/g, ' ');
  const length = days === 1 ? '1 day ended' : `${days} days ended`;
  return `${activity.charAt(0).toUpperCase()}${activity.slice(1)} · ${length}`;
}

/** Poster title when the viewer holds the honor vs when browsing someone else's. */
export function honorCardTitle(honor: MatchHonor, isHolder: boolean): string {
  if (honor.kind === 'champion') {
    return isHolder ? 'You took the crown.' : `${honor.displayName} took the crown.`;
  }
  return honor.title;
}

/** List / honors-board row label. */
export function honorBoardLine(honor: MatchHonor): string {
  if (honor.kind === 'champion') {
    return `${honor.displayName} · Crown · ${honor.proof.replace(/^Comeback King · /, '')}`;
  }
  return `${honor.displayName} · ${honor.title.replace(/\.$/, '')}`;
}

/** Fallback share line when the active slide is the group recap. */
export function honorGroupLabel(board: MatchBoard): string {
  return groupTitle(board.standings, board);
}
