import type { MatchListItem } from '@product/client';
import { GROUP_MOVE_ACTIVITY, TODAY_COPY } from './constants/today-copy';
import { dayKeyName, daysBetweenDayKeys, shiftDayKey } from './day-keys';
import type { TallyLabel, TodayDeck } from './types/today-deck';
import { formatClockTime } from '@/lib/clock-time';

/** Past a week, a weekday name stops saying which day it was. */
const DAYS_NAMED_BY_WEEKDAY = 7;
const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;

export function weekdayLabel(at: Date): string {
  return at.toLocaleDateString('en-GB', { weekday: 'long' });
}

export function dayMonthLabel(at: Date): string {
  return at.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}

export function lastUpdatedLabel(updatedAt: number): string {
  return `Last updated ${formatClockTime(new Date(updatedAt))}`;
}

function daysLabel(days: number): string {
  return days === 1 ? '1 day' : `${days} days`;
}

type RunState = {
  streakDays: number;
  lapsedYesterday: boolean;
  bestStreakDays: number;
};

/** The right-hand side of the tally: the run, else the record, so the past still counts. */
export function runLabel({ streakDays, lapsedYesterday, bestStreakDays }: RunState): string | null {
  if (streakDays > 0) {
    return `${daysLabel(streakDays)} running`;
  }

  if (bestStreakDays > 1) {
    return `Best run ${daysLabel(bestStreakDays)}`;
  }

  return lapsedYesterday ? TODAY_COPY.newRun : null;
}

/** When a reading was last logged; never what it said. */
export function lastReadingLabel(lastDayKey: string, todayKey: string): string {
  const daysAgo = daysBetweenDayKeys(lastDayKey, todayKey);
  if (daysAgo <= 0) {
    return `${TODAY_COPY.lastReading} today`;
  }

  if (daysAgo === 1) {
    return `${TODAY_COPY.lastReading} yesterday`;
  }

  const format = daysAgo < DAYS_NAMED_BY_WEEKDAY ? 'weekday' : 'date';
  return `${TODAY_COPY.lastReading} ${dayKeyName(lastDayKey, format)}`;
}

/** Under the week's rank: how far today moved it, only when it moved up. */
export function weeklyRankLabel(rank: number, rankAtDayStart: number | null): string {
  const climbed = rankAtDayStart === null ? 0 : rankAtDayStart - rank;
  return climbed > 0 ? `${TODAY_COPY.rankLabel}, up ${climbed}` : TODAY_COPY.rankLabel;
}

export function groupMoveActivity(match: Pick<MatchListItem, 'scoringMode' | 'metric'>): string {
  if (match.scoringMode === 'days_completed') {
    return GROUP_MOVE_ACTIVITY.days_completed;
  }

  return GROUP_MOVE_ACTIVITY[match.metric];
}

export function minutesAgoLabel(at: string, now: Date): string {
  const minutes = Math.floor((now.getTime() - Date.parse(at)) / MS_PER_MINUTE);
  if (minutes < 1) {
    return 'just now';
  }

  if (minutes < MINUTES_PER_HOUR) {
    return `${minutes} min ago`;
  }

  return `${Math.floor(minutes / MINUTES_PER_HOUR)} h ago`;
}

export function streakSentence(streakDays: number): string | null {
  if (streakDays <= 1) {
    return null;
  }

  return `${streakDays} days in a row.`;
}

type TallyCounts = Pick<
  TodayDeck,
  'completedCount' | 'openCount' | 'totalCount' | 'isDayDone' | 'showsMembershipLine'
>;

export function tallyLabel(deck: TallyCounts): TallyLabel {
  if (deck.showsMembershipLine) {
    return { strong: 'Win locked', rest: `${deck.openCount} extra` };
  }

  if (deck.isDayDone) {
    return { strong: `${deck.completedCount} done`, rest: 'All done' };
  }

  if (deck.completedCount === 0) {
    return { strong: `${deck.openCount} to go`, rest: null };
  }

  return { strong: `${deck.completedCount} done`, rest: `${deck.openCount} to go` };
}

export function ordinal(rank: number): string {
  const lastTwo = rank % 100;
  if (lastTwo >= 11 && lastTwo <= 13) {
    return `${rank}th`;
  }

  const suffixByLastDigit: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' };
  return `${rank}${suffixByLastDigit[rank % 10] ?? 'th'}`;
}

export function positionLabel(position: number, total: number): string {
  return `${position} of ${total}`;
}

/** The calendar day after `dayKey` (YYYY-MM-DD), for tomorrow's tip. */
export function nextDayKey(dayKey: string): string {
  return shiftDayKey(dayKey, 1);
}

/** Says what was done, never what was measured: no reading leaves the phone. */
export function shareDayMessage(completedCount: number, streakDays: number): string {
  const challenges = completedCount === 1 ? '1 challenge' : `${completedCount} challenges`;
  const run = streakDays > 1 ? ` ${streakDays} days in a row.` : '';
  return `I finished ${challenges} on Healthy today.${run}`;
}
