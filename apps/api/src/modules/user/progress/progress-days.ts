import { shiftDayKey } from '../../../shared/utils/day-key.js';
import type { ProgressDayDto } from './dto/index.js';
import type { DailyOccurrence, LedgerDayRow } from './types/progress.js';

/** Every day from `lastDayKey` back to `firstDayKey`, newest first. */
export function dayKeysNewestFirst(firstDayKey: string, lastDayKey: string): string[] {
  const dayKeys: string[] = [];
  for (let dayKey = lastDayKey; dayKey >= firstDayKey; dayKey = shiftDayKey(dayKey, -1)) {
    dayKeys.push(dayKey);
  }
  return dayKeys;
}

function groupByDay<Row extends { dayKey: string }>(rows: readonly Row[]): Map<string, Row[]> {
  const byDay = new Map<string, Row[]>();
  for (const row of rows) {
    byDay.set(row.dayKey, [...(byDay.get(row.dayKey) ?? []), row]);
  }
  return byDay;
}

function summariseDay(
  dayKey: string,
  occurrences: readonly DailyOccurrence[],
  ledger: readonly LedgerDayRow[],
  measuredDayKeys: ReadonlySet<string>,
): ProgressDayDto {
  const pointsLost = ledger
    .filter((row) => row.isChallengeLinked && row.delta < 0)
    .reduce((total, row) => total - row.delta, 0);

  return {
    dayKey,
    dailyChallenges: occurrences.map((occurrence) => ({
      challengeId: occurrence.challengeId,
      category: occurrence.category,
      completionKind: occurrence.completionKind,
      capture: occurrence.capture,
      isDone: occurrence.isRewarded,
    })),
    pointsTotal: ledger.reduce((total, row) => total + row.delta, 0),
    pointsLost,
    isShownUp:
      occurrences.some((occurrence) => occurrence.isRewarded) || measuredDayKeys.has(dayKey),
  };
}

/** One summary per day, so a day with nothing in it still has its row. */
export function buildProgressDays(input: {
  dayKeys: readonly string[];
  occurrences: readonly DailyOccurrence[];
  ledger: readonly LedgerDayRow[];
  /** Local days that already logged a measured set (contest, practice, walk). */
  measuredDayKeys?: ReadonlySet<string>;
}): ProgressDayDto[] {
  const occurrencesByDay = groupByDay(input.occurrences);
  const ledgerByDay = groupByDay(input.ledger);
  const measuredDayKeys = input.measuredDayKeys ?? new Set<string>();

  return input.dayKeys.map((dayKey) =>
    summariseDay(
      dayKey,
      occurrencesByDay.get(dayKey) ?? [],
      ledgerByDay.get(dayKey) ?? [],
      measuredDayKeys,
    ),
  );
}
