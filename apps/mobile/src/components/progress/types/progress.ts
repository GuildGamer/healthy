import type { ProgressDay } from '@product/client';

/**
 * How a day sits on the week card. A missed day is only ever an empty square:
 * nothing on the card marks it as a failure.
 */
export type WeekDayState = 'shownUp' | 'missed' | 'open' | 'upcoming' | 'beforeJoining';

export interface WeekDay {
  dayKey: string;
  state: WeekDayState;
  isToday: boolean;
}

export interface WeekSummary {
  days: WeekDay[];
  shownUpCount: number;
  /** Days of this week since joining, today included. */
  countedDays: number;
  isTodayOpen: boolean;
}

export interface HistorySection {
  weekStartKey: string;
  title: string;
  pointsTotal: number;
  days: ProgressDay[];
}
