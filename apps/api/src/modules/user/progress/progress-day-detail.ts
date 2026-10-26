import { practiceActivityReason } from '@product/contract';
import type { ProgressDayDetailDto } from './dto/index.js';
import type { DailyOccurrence, LedgerDetailRow, PracticeRow } from './types/progress.js';

type LinkedRow = LedgerDetailRow & { occurrence: NonNullable<LedgerDetailRow['occurrence']> };

function isLinked(row: LedgerDetailRow): row is LinkedRow {
  return row.occurrence !== null;
}

function markOf(occurrence: LinkedRow['occurrence']) {
  return {
    challengeId: occurrence.challengeId,
    category: occurrence.category,
    completionKind: occurrence.completionKind,
    capture: occurrence.capture,
  };
}

/** One row per finished occurrence, whatever number of awards it took. */
function doneItems(rows: readonly LinkedRow[]): ProgressDayDetailDto['done'] {
  const byOccurrence = new Map<string, ProgressDayDetailDto['done'][number]>();
  for (const row of rows) {
    const existing = byOccurrence.get(row.occurrence.userChallengeId);
    if (existing) {
      existing.points += row.delta;
      continue;
    }

    byOccurrence.set(row.occurrence.userChallengeId, {
      ...markOf(row.occurrence),
      userChallengeId: row.occurrence.userChallengeId,
      title: row.occurrence.title,
      completedAt: (row.occurrence.completedAt ?? row.createdAt).toISOString(),
      points: row.delta,
      share: row.occurrence.share,
      proofClip: row.occurrence.proofClip,
    });
  }

  return [...byOccurrence.values()].sort((left, right) =>
    left.completedAt.localeCompare(right.completedAt),
  );
}

function missedPhotoChecks(rows: readonly LinkedRow[]): ProgressDayDetailDto['missedPhotoChecks'] {
  return rows.map((row) => ({
    ...markOf(row.occurrence),
    userChallengeId: row.occurrence.userChallengeId,
    title: row.occurrence.title,
    resolution: row.occurrence.photoCheck.resolution,
    windowSeconds: row.occurrence.photoCheck.windowSeconds,
    pointsLost: -row.delta,
    at: row.createdAt.toISOString(),
  }));
}

/**
 * A day as the ledger saw it. Points come only from ledger rows, so the day's
 * total here always matches the History row; the occurrences only say how many
 * daily challenges were due and done.
 */
export function buildProgressDayDetail(input: {
  dayKey: string;
  ledger: readonly LedgerDetailRow[];
  dailyOccurrences: readonly DailyOccurrence[];
  practice: readonly PracticeRow[];
}): ProgressDayDetailDto {
  const linked = input.ledger.filter(isLinked);
  const earnedRows = linked.filter((row) => row.delta > 0);
  const lostRows = linked.filter((row) => row.delta < 0);

  return {
    dayKey: input.dayKey,
    pointsEarned: input.ledger
      .filter((row) => row.delta > 0)
      .reduce((total, row) => total + row.delta, 0),
    pointsLost: lostRows.reduce((total, row) => total - row.delta, 0),
    dailyDoneCount: input.dailyOccurrences.filter((occurrence) => occurrence.isRewarded).length,
    dailyDueCount: input.dailyOccurrences.length,
    done: doneItems(earnedRows),
    missedPhotoChecks: missedPhotoChecks(lostRows),
    practice: input.practice.map((session) => ({
      id: session.id,
      title: practiceActivityReason(session.metric),
      metric: session.metric,
      count: session.count,
      durationSeconds: session.durationSeconds,
      recordedAt: session.createdAt.toISOString(),
      proofClip: session.proofClip,
    })),
    adjustments: input.ledger
      .filter((row) => row.occurrence === null)
      .map((row) => ({
        id: row.id,
        reason: row.reason,
        points: row.delta,
        at: row.createdAt.toISOString(),
      })),
  };
}
