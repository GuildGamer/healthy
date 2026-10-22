import type { MatchBoard } from '@product/client';
import { ordinal } from '@/components/home/today-labels';
import { contestDays } from './group-rerun';
import { groupKindLabel } from './group-rule-copy';
import { RESULT_COPY } from './match-copy';
import { matchScoreUnitFor } from './match-metric';

export type GroupRecapFact = { label: string; value: string };

export type GroupRecapContent = {
  kind: string;
  length: string;
  headline: string;
  hero: { value: string; unit: string };
  facts: GroupRecapFact[];
  /** Only where it is true: a walk or a set the phone measured itself. */
  claim: string | null;
};

const MEASURED_CLAIM = {
  walk: 'Every minute sensor-measured',
  pushups: 'Every rep counted by the camera',
} as const;

function lengthLabel(board: MatchBoard): string {
  const days = contestDays(board);
  return days === 1 ? '1 day' : `${days} days`;
}

function headlineFor(board: MatchBoard, place: number | null): string {
  if (place === null) {
    return RESULT_COPY.recapFinished;
  }

  return place === 1 && board.winnerUserId !== null
    ? RESULT_COPY.youWon
    : RESULT_COPY.recapPlace(ordinal(place));
}

/**
 * The finished group as a picture: your place as the one big number, your
 * own score and the length beside it. It names nobody else and nothing about
 * what anyone manages.
 */
export function groupRecapContent(board: MatchBoard): GroupRecapContent {
  const you = board.standings.find((row) => row.isYou);
  const place = you && you.score > 0 ? you.rank : null;
  const score = you?.score ?? 0;
  const facts = [
    {
      label: RESULT_COPY.recapScore,
      value: `${score} ${matchScoreUnitFor(board.scoringMode, board.metric, score)}`,
    },
    { label: RESULT_COPY.recapLength, value: lengthLabel(board) },
  ];

  return {
    kind: groupKindLabel(board),
    length: lengthLabel(board),
    headline: headlineFor(board, place),
    hero: place
      ? { value: ordinal(place), unit: RESULT_COPY.recapOfGroup(board.participantCount) }
      : { value: String(score), unit: matchScoreUnitFor(board.scoringMode, board.metric, score) },
    facts,
    claim: board.scoringMode === 'days_completed' ? null : MEASURED_CLAIM[board.metric],
  };
}
