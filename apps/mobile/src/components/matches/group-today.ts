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

/** The group named by its other members, "Ada, Tunde +3", or by its activity while you wait. */
export function groupTitle(standings: readonly MatchStanding[], rules: GroupRules): string {
  const others = standings.filter((standing) => !standing.isYou);
  if (others.length === 0) {
    return BOARD_COPY.waitingTitle(groupNoun(rules));
  }

  return crewLabel(others.map((standing) => standing.displayName));
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
