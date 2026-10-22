import type { MatchDayStrip } from '@product/client';

export type DaySquare = {
  dayKey: string;
  /** The weekday's initial: "T", "F", "S". */
  letter: string;
  isHit: boolean;
  isToday: boolean;
};

function weekdayInitial(dayKey: string): string {
  return new Date(`${dayKey}T00:00:00.000Z`).toLocaleDateString('en-GB', {
    weekday: 'narrow',
    timeZone: 'UTC',
  });
}

/** One square per contest day, filled for the days you moved the board. */
export function daySquaresFor(strip: MatchDayStrip, movedDayKeys: readonly string[]): DaySquare[] {
  const moved = new Set(movedDayKeys);
  return strip.dayKeys.map((dayKey) => ({
    dayKey,
    letter: weekdayInitial(dayKey),
    isHit: moved.has(dayKey),
    isToday: dayKey === strip.todayKey,
  }));
}

/** "of 7 days", counted from the squares so the unit and the row agree. */
export function dayStripUnit(strip: MatchDayStrip): string {
  return `of ${strip.dayKeys.length} days`;
}
