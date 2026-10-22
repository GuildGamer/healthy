import type { LeaderboardEntry, ListLeaderboardOutput } from '@product/client';
import { ordinal } from '@/components/home/today-labels';
import { formatPoints } from '@/components/points';
import {
  BOARD_COPY,
  BOARD_NEAR_TOP_LENGTH,
  BOARD_TOP_COUNT,
  BOARD_UNRANKED_LENGTH,
} from './constants/board';
import type { BoardRow, BoardStanding } from './types/board';

type BoardInput = Pick<
  ListLeaderboardOutput,
  'entries' | 'aroundCurrentUser' | 'currentUserRank' | 'currentUserPoints' | 'currentUserVisible'
>;

export function boardStanding(board: BoardInput, isHiddenInSettings: boolean): BoardStanding {
  if (isHiddenInSettings || !board.currentUserVisible) {
    return { kind: 'hidden' };
  }

  const rank = board.currentUserRank;
  if (rank === null) {
    return { kind: 'unranked' };
  }

  const ahead = board.aroundCurrentUser.find((entry) => entry.rank === rank - 1) ?? null;
  return { kind: 'ranked', rank, ahead, points: board.currentUserPoints };
}

function entryRows(entries: readonly LeaderboardEntry[]): BoardRow[] {
  return entries.map((entry) => ({ kind: 'entry', entry }));
}

/**
 * The top three, a gap, then the people around you. Near the top the gap
 * would hide nobody, so the list is the top six instead.
 */
export function boardRows(board: BoardInput, standing: BoardStanding): BoardRow[] {
  if (standing.kind !== 'ranked') {
    return entryRows(board.entries.slice(0, BOARD_UNRANKED_LENGTH));
  }

  if (standing.rank <= BOARD_NEAR_TOP_LENGTH) {
    const length = Math.max(BOARD_NEAR_TOP_LENGTH, standing.rank + 2);
    return entryRows(board.entries.slice(0, length));
  }

  const top = board.entries.slice(0, BOARD_TOP_COUNT);
  return [...entryRows(top), { kind: 'gap', key: 'gap' }, ...entryRows(board.aroundCurrentUser)];
}

/** Ties keep their order, so passing someone takes one point more than they have. */
function pointsToPass(ahead: LeaderboardEntry, points: number): string {
  const gap = ahead.points - points + 1;
  return gap === 1 ? '1 point' : `${formatPoints(gap)} points`;
}

export function boardHeadline(standing: BoardStanding): { eyebrow: string; headline: string } {
  if (standing.kind === 'hidden') {
    return { eyebrow: BOARD_COPY.youre, headline: BOARD_COPY.hidden };
  }

  if (standing.kind === 'unranked') {
    return { eyebrow: BOARD_COPY.yourPlace, headline: BOARD_COPY.notYet };
  }

  return { eyebrow: BOARD_COPY.youre, headline: ordinal(standing.rank) };
}

/** "41 points to pass Gentle Moth. Resets Monday." */
export function boardLine(standing: BoardStanding): string {
  if (standing.kind === 'hidden') {
    return BOARD_COPY.hiddenLine;
  }

  if (standing.kind === 'unranked') {
    return BOARD_COPY.joinLine;
  }

  if (standing.rank === 1) {
    return BOARD_COPY.firstLine;
  }

  if (!standing.ahead) {
    return BOARD_COPY.resets;
  }

  const toPass = pointsToPass(standing.ahead, standing.points);
  return `${toPass} to pass ${standing.ahead.displayName}. ${BOARD_COPY.resets}`;
}

/** The Leaderboard row on You: "41 points to pass 37th". */
export function boardLinkMeta(standing: BoardStanding): string {
  if (standing.kind === 'hidden') {
    return BOARD_COPY.hiddenMeta;
  }

  if (standing.kind === 'unranked') {
    return BOARD_COPY.unrankedMeta;
  }

  if (standing.rank === 1) {
    return BOARD_COPY.firstMeta;
  }

  if (!standing.ahead) {
    return BOARD_COPY.resets;
  }

  return `${pointsToPass(standing.ahead, standing.points)} to pass ${ordinal(standing.rank - 1)}`;
}
