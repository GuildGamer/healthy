import type { MatchMove, MatchStanding } from '@product/contract';
import { dayKeyFor } from '../../../shared/utils/day-key.js';

/** The top of the standings, with the viewer swapped into the last row if they are below it. */
export function rosterFor(standings: readonly MatchStanding[], size: number): MatchStanding[] {
  const top = standings.slice(0, size);
  if (top.some((standing) => standing.isYou)) {
    return top;
  }

  const viewer = standings.find((standing) => standing.isYou);
  if (!viewer) {
    return top;
  }

  return [...standings.slice(0, size - 1), viewer];
}

type LastMoveInput = {
  standings: readonly MatchStanding[];
  scoredAtByUser: ReadonlyMap<string, Date>;
  /** The contest's zone, so "today" is the same day its daily cap uses. */
  timeZone: string;
  now: Date;
};

/**
 * The most recent time someone else's score went up today. Built only from
 * what the board already shows, a name and the moment their score moved, so
 * it tells a member nothing the group could not already see.
 */
export function lastMoveFor({
  standings,
  scoredAtByUser,
  timeZone,
  now,
}: LastMoveInput): MatchMove | null {
  const todayKey = dayKeyFor(timeZone, now);
  let latest: { standing: MatchStanding; scoredAt: Date } | null = null;

  for (const standing of standings) {
    const scoredAt = scoredAtByUser.get(standing.userId);
    const isOthersMoveToday =
      !standing.isYou &&
      !standing.isPending &&
      scoredAt !== undefined &&
      dayKeyFor(timeZone, scoredAt) === todayKey;

    if (isOthersMoveToday && (!latest || scoredAt > latest.scoredAt)) {
      latest = { standing, scoredAt };
    }
  }

  if (!latest) {
    return null;
  }

  return {
    displayName: latest.standing.displayName,
    image: latest.standing.image ?? null,
    movedAt: latest.scoredAt.toISOString(),
  };
}
