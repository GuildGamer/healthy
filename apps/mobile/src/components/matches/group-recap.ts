import type { MatchBoard } from '@product/client';
import { ordinal } from '@/components/home/today-labels';
import { contestDays } from './group-rerun';
import { groupKindLabel } from './group-rule-copy';
import { RESULT_COPY } from './match-copy';
import { formatBoardScore } from './match-metric';

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

const MEASURED_CLAIM: Record<MatchBoard['metric'], string> = {
  walk: 'Every minute sensor-measured',
  pushups: 'Every rep counted by the camera',
  squats: 'Every rep counted by the camera',
  plank: 'Every second timed by the camera',
  jumping_jacks: 'Every rep counted by the camera',
  burpees: 'Every rep counted by the camera',
  sit_ups: 'Every rep counted by the camera',
  mountain_climbers: 'Every rep counted by the camera',
  lunges: 'Every rep counted by the camera',
};

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
  const formatted = formatBoardScore(board.scoringMode, board.metric, score);
  const scoreLine = formatted.unit
    ? `${formatted.value} ${formatted.unit}`
    : formatted.value;
  const facts = [
    {
      label: RESULT_COPY.recapScore,
      value: scoreLine,
    },
    { label: RESULT_COPY.recapLength, value: lengthLabel(board) },
  ];

  return {
    kind: groupKindLabel(board),
    length: lengthLabel(board),
    headline: headlineFor(board, place),
    hero: place
      ? { value: ordinal(place), unit: RESULT_COPY.recapOfGroup(board.participantCount) }
      : { value: formatted.value, unit: formatted.unit },
    facts,
    claim: board.scoringMode === 'days_completed' ? null : MEASURED_CLAIM[board.metric],
  };
}
