import type { MatchBoard, MatchListItem, MatchStanding } from '@product/client';
import { ordinal } from '@/components/home/today-labels';
import { formatDayMonth } from '@/lib/format-day';
import { GROUPS_COPY, RESULT_COPY } from './match-copy';
import { groupKindLabel, groupNoun } from './group-rule-copy';
import { contestDays } from './group-rerun';
import { matchScoreUnitFor } from './match-metric';

export type PastGroupSection = { label: string; items: MatchListItem[] };

function monthLabel(isoDate: string, now: Date): string {
  const at = new Date(isoDate);
  const sameYear = at.getFullYear() === now.getFullYear();
  return at.toLocaleDateString(
    'en-GB',
    sameYear ? { month: 'long' } : { month: 'long', year: 'numeric' },
  );
}

/** Ended groups, newest first, under the month they ended in. */
export function pastGroupSections(
  ended: readonly MatchListItem[],
  now: Date = new Date(),
): PastGroupSection[] {
  const newestFirst = [...ended].sort((left, right) => right.endsAt.localeCompare(left.endsAt));
  const sections: PastGroupSection[] = [];

  for (const item of newestFirst) {
    const label = monthLabel(item.endsAt, now);
    const last = sections[sections.length - 1];
    if (last?.label === label) {
      last.items.push(item);
    } else {
      sections.push({ label, items: [item] });
    }
  }

  return sections;
}

/** "Best set · ended 19 Oct", or "Walking total · cancelled". */
export function pastGroupMeta(item: MatchListItem): string {
  const ending =
    item.status === 'cancelled' ? GROUPS_COPY.cancelled : `ended ${formatDayMonth(item.endsAt)}`;
  return `${groupKindLabel(item)} · ${ending}`;
}

/** "4 ended · you won 2" for the folded row on the Groups list. */
export function pastGroupsSummary(ended: readonly MatchListItem[]): string {
  const wins = ended.filter(
    (item) => item.status === 'completed' && item.yourRank === 1 && item.yourScore > 0,
  );
  const endedLabel = `${ended.length} ended`;
  return wins.length > 0 ? `${endedLabel} · you won ${wins.length}` : endedLabel;
}

/** Where you finished. A cancelled group has no finish. */
export function finishLabel(item: MatchListItem): string {
  if (item.status === 'cancelled' || !item.yourRank || item.yourScore === 0) {
    return GROUPS_COPY.noPlace;
  }

  return ordinal(item.yourRank);
}

export type ResultSummary = { headline: string; sentence: string; lengthLine: string };

function lengthLine(board: MatchBoard): string {
  const days = contestDays(board);
  return `${groupKindLabel(board)} · ${days === 1 ? '1 day' : `${days} days`}`;
}

/**
 * The ending in one headline and one sentence. The winner first, then your
 * own line; no consolation copy.
 */
export function resultSummary(board: MatchBoard): ResultSummary {
  const winner = board.standings.find((row) => row.userId === board.winnerUserId);
  const you = board.standings.find((row) => row.isYou);
  const unit = (score: number) => matchScoreUnitFor(board.scoringMode, board.metric, score);

  if (!winner) {
    return { headline: RESULT_COPY.nobodyWon, sentence: '', lengthLine: lengthLine(board) };
  }

  if (!winner.isYou) {
    const sentence =
      you && you.score > 0
        ? `You came ${ordinal(you.rank)} with ${you.score} ${unit(you.score)}.`
        : 'You didn’t score this time.';
    return {
      headline: RESULT_COPY.theyWon(winner.displayName),
      sentence,
      lengthLine: lengthLine(board),
    };
  }

  const runnerUp = board.standings.find((row) => !row.isYou && row.score > 0) ?? null;
  const sentence = winningSentence(`${winner.score} ${unit(winner.score)}`, winner, runnerUp);
  return { headline: RESULT_COPY.youWon, sentence, lengthLine: lengthLine(board) };
}

/**
 * The line a result is shared with outside the group. It names nobody else
 * and nothing about what anyone manages, only your own place.
 */
export function resultShareLine(board: MatchBoard): string {
  const you = board.standings.find((row) => row.isYou);
  const group = `a ${contestDays(board)}-day ${groupNoun(board)} group`;

  if (you && board.winnerUserId === you.userId) {
    return `I won ${group} on Healthy.`;
  }

  if (!you || you.score === 0) {
    return `I just finished ${group} on Healthy.`;
  }

  return `I came ${ordinal(you.rank)} in ${group} on Healthy.`;
}

function winningSentence(
  score: string,
  winner: MatchStanding,
  runnerUp: MatchStanding | null,
): string {
  if (!runnerUp) {
    return `${score}.`;
  }

  if (winner.score === runnerUp.score) {
    return `${score}, level with ${runnerUp.displayName} but there first.`;
  }

  return `${score}, ${winner.score - runnerUp.score} ahead of ${runnerUp.displayName}.`;
}
