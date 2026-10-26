import type { MatchReactionKind, MatchReactionSent, MatchStanding } from '@product/client';
import { crewLabel } from '@product/contract/match-board';
import { ordinal } from '@/components/home/today-labels';
import { BOARD_COPY, GROUPS_COPY } from './match-copy';
import { type GroupRules, groupNoun } from './group-rule-copy';

/** How a face reads in the today strip and on the Groups list. */
export type FaceLook = 'lit' | 'off' | 'pending';

export function faceLookFor(standing: MatchStanding): FaceLook {
  if (standing.isPending) {
    return 'pending';
  }

  return standing.doneToday ? 'lit' : 'off';
}

/** What tapping a face does. Your own face and an unaccepted seat do nothing. */
export type FaceTap =
  | { kind: 'none' }
  | { kind: 'cheer' }
  | { kind: 'nudge' }
  | { kind: 'alreadySent'; sent: MatchReactionSent };

/** What the viewer already sent this member today of one kind, if anything. */
export function sentToday(
  standing: MatchStanding,
  kind: MatchReactionKind,
): MatchReactionSent | null {
  return standing.yourReactionsToday?.find((sent) => sent.kind === kind) ?? null;
}

/**
 * One of each kind a day: a nudge in the morning can still be followed by a
 * cheer once they are done, but a second tap of the same kind only explains.
 */
export function faceTapFor(standing: MatchStanding): FaceTap {
  if (standing.isYou || standing.isPending) {
    return { kind: 'none' };
  }

  const kind = standing.doneToday ? 'cheer' : 'nudge';
  const sent = sentToday(standing, kind);
  return sent ? { kind: 'alreadySent', sent } : { kind };
}

/** Who has done today, out of the people actually playing. */
export function todayTally(standings: readonly MatchStanding[]): { done: number; total: number } {
  const playing = standings.filter((standing) => !standing.isPending);
  return {
    done: playing.filter((standing) => standing.doneToday).length,
    total: playing.length,
  };
}

type GroupTitleSource = GroupRules & { hostTitle?: string | null };

/**
 * What the group is called on the board and in lists. Prefers the host-written
 * name; otherwise "You vs Joseph" for two, "You, Ada, Tunde +2" for more, or
 * the waiting title before anyone joins.
 */
export function groupTitle(standings: readonly MatchStanding[], rules: GroupTitleSource): string {
  const hostTitle = rules.hostTitle?.trim();
  if (hostTitle) {
    return hostTitle;
  }

  const others = standings.filter((standing) => !standing.isYou);
  if (others.length === 0) {
    return BOARD_COPY.waitingTitle(groupNoun(rules));
  }

  if (others.length === 1) {
    return BOARD_COPY.versusTitle(others[0]!.displayName);
  }

  return BOARD_COPY.withOthersTitle(crewLabel(others.map((standing) => standing.displayName)));
}

/** Top non-pending score and who holds it, for the board hero. */
export type GroupBest = {
  score: number;
  /** "You", a first name, or "Tied" when several share the top. */
  holder: string;
};

export function groupBest(standings: readonly MatchStanding[]): GroupBest | null {
  const playing = standings.filter((standing) => !standing.isPending);
  const topScore = Math.max(0, ...playing.map((standing) => standing.score));
  if (topScore <= 0) {
    return null;
  }

  const holders = playing.filter((standing) => standing.score === topScore);
  if (holders.length === 0) {
    return null;
  }

  if (holders.length > 1) {
    return { score: topScore, holder: BOARD_COPY.groupBestTied };
  }

  const sole = holders[0]!;
  return {
    score: topScore,
    holder: sole.isYou ? BOARD_COPY.you : sole.displayName,
  };
}

/** "2nd", once somebody has scored. Before that a place is one nobody earned. */
export function placeLabel(standings: readonly MatchStanding[]): string {
  const you = standings.find((standing) => standing.isYou);
  const anyoneScored = standings.some((standing) => standing.score > 0);
  if (!you || you.isPending || !anyoneScored || standings.length < 2) {
    return GROUPS_COPY.noPlace;
  }

  return ordinal(you.rank);
}

export function displayNameFor(standing: MatchStanding): string {
  return standing.isYou ? BOARD_COPY.you : standing.displayName;
}
