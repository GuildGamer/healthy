import type {
  ProgressDay,
  ProgressDayDetail,
  ProgressDoneItem,
  ProgressMissedPhotoCheck,
  ProgressPracticeItem,
  ProgressShareResult,
} from '@product/client';
import { dayKeyName, shiftDayKey } from '@/components/home/day-keys';
import { formatPoints, formatPointsDelta } from '@/components/points';
import { formatClockTime } from '@/lib/clock-time';
import { DAYS_PER_WEEK, PROGRESS_COPY } from './constants/progress-copy';
import type { WeekSummary } from './types/progress';

const SECONDS_PER_MINUTE = 60;

/** "of 4 days so far", or "of 7 days" once the whole week is in. */
export function weekMeasureUnit(
  summary: Pick<WeekSummary, 'shownUpCount' | 'countedDays'>,
): string {
  if (summary.shownUpCount === DAYS_PER_WEEK) {
    return `of ${DAYS_PER_WEEK} days`;
  }

  const noun = summary.countedDays === 1 ? 'day' : 'days';
  return `of ${summary.countedDays} ${noun} so far`;
}

/** One quiet line, only when there is something to say. */
export function weekLine(
  summary: Pick<WeekSummary, 'shownUpCount' | 'isTodayOpen'>,
): string | null {
  if (summary.shownUpCount === DAYS_PER_WEEK) {
    return PROGRESS_COPY.wholeWeek;
  }

  return summary.isTodayOpen ? PROGRESS_COPY.fillToday : null;
}

/** Day keys are read at UTC midnight, so the label is the same in any device zone. */
function shortDate(dayKey: string): { day: string; month: string } {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  return {
    day: String(date.getUTCDate()),
    month: date.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }),
  };
}

/** "19–25 Oct", or "29 Sep – 5 Oct" when the week crosses a month. */
export function weekRangeLabel(weekStartKey: string): string {
  const first = shortDate(weekStartKey);
  const last = shortDate(shiftDayKey(weekStartKey, DAYS_PER_WEEK - 1));
  if (first.month === last.month) {
    return `${first.day}–${last.day} ${last.month}`;
  }

  return `${first.day} ${first.month} – ${last.day} ${last.month}`;
}

/** "Today", "Wednesday" within the last fortnight, "Sunday 4 Oct" before that. */
export function historyDayTitle(
  dayKey: string,
  todayKey: string,
  lastWeekStartKey: string,
): string {
  if (dayKey === todayKey) {
    return 'Today';
  }

  const weekday = dayKeyName(dayKey, 'weekday');
  if (dayKey >= lastWeekStartKey) {
    return weekday;
  }

  const { day, month } = shortDate(dayKey);
  return `${weekday} ${day} ${month}`;
}

/** "2 of 5 so far", "All 5 done", "4 of 5", or "Nothing done". */
export function historyDayDetail(day: ProgressDay, isToday: boolean): string {
  const due = day.dailyChallenges.length;
  const done = day.dailyChallenges.filter((challenge) => challenge.isDone).length;

  if (done === 0) {
    return isToday ? PROGRESS_COPY.nothingYet : PROGRESS_COPY.nothingDone;
  }

  if (isToday) {
    return `${done} of ${due} so far`;
  }

  return done === due ? `All ${due} done` : `${done} of ${due}`;
}

export function photoCheckLossLabel(pointsLost: number): string {
  return `−${formatPoints(pointsLost)} photo check`;
}

/** "Tuesday, 20 Oct" for the top of a day. */
export function dayPageTitle(dayKey: string): string {
  const { day, month } = shortDate(dayKey);
  return `${dayKeyName(dayKey, 'weekday')}, ${day} ${month}`;
}

/** What the day moved the balance by, from the same rows the History row sums. */
export function dayDetailTotal(detail: ProgressDayDetail): number {
  const done = detail.done.reduce((total, item) => total + item.points, 0);
  const adjusted = detail.adjustments.reduce((total, item) => total + item.points, 0);
  return done + adjusted - detail.pointsLost;
}

/** "750 earned, 100 lost to a missed photo check." */
export function daySentence(detail: ProgressDayDetail): string {
  if (detail.pointsEarned === 0 && detail.pointsLost === 0) {
    return PROGRESS_COPY.noPointsThatDay;
  }

  const earned = `${formatPoints(detail.pointsEarned)} earned`;
  if (detail.pointsLost === 0) {
    return `${earned}.`;
  }

  const checks =
    detail.missedPhotoChecks.length === 1 ? 'a missed photo check' : 'missed photo checks';
  return `${earned}, ${formatPoints(detail.pointsLost)} lost to ${checks}.`;
}

function durationLabel(totalSeconds: number): string {
  if (totalSeconds < SECONDS_PER_MINUTE) {
    return totalSeconds === 1 ? '1 second' : `${totalSeconds} seconds`;
  }

  const minutes = Math.round(totalSeconds / SECONDS_PER_MINUTE);
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
}

/** The reason in plain words, never a code. */
export function missedPhotoReason(
  check: Pick<ProgressMissedPhotoCheck, 'resolution' | 'windowSeconds'>,
): string {
  if (check.resolution === 'skipped') {
    return PROGRESS_COPY.skippedPhoto;
  }

  return `No photo within ${durationLabel(check.windowSeconds)} of the check-in.`;
}

/** Practice earns nothing, so it shows the reps that were done instead of +0. */
export function practiceAmount(item: Pick<ProgressPracticeItem, 'metric' | 'count'>): string {
  if (item.metric !== 'pushups' || item.count === null) {
    return PROGRESS_COPY.practiceNoPoints;
  }

  return item.count === 1 ? '1 rep' : `${item.count} reps`;
}

/** What was measured on a finish; points only when there is nothing to measure. */
export function doneAmount(item: Pick<ProgressDoneItem, 'share' | 'points'>): string {
  const measured = shareAmount(item.share);
  return measured ?? formatPointsDelta(item.points);
}

function shareAmount(share: ProgressShareResult | null): string | null {
  if (!share) {
    return null;
  }

  if (share.kind === 'reps') {
    return share.count === 1 ? '1 rep' : `${share.count} reps`;
  }

  if (share.kind === 'minutes') {
    return share.minutes === 1 ? '1 min' : `${share.minutes} min`;
  }

  if (share.kind === 'glasses') {
    return share.count === 1 ? '1 glass' : `${share.count} glasses`;
  }

  return null;
}

/** Clock plus points earned, so the trailing amount can stay the measurement. */
export function doneMeta(item: Pick<ProgressDoneItem, 'completedAt' | 'points'>): string {
  return `${clockTime(item.completedAt)} · ${formatPointsDelta(item.points)}`;
}

/** What a practice set measured: its reps, or how long it lasted when it counts none. */
export function practiceMeasure(
  item: Pick<ProgressPracticeItem, 'metric' | 'count' | 'durationSeconds'>,
): string {
  if (item.count !== null && item.metric !== 'plank') {
    return item.count === 1 ? '1 rep' : `${item.count} reps`;
  }

  return durationLabel(item.durationSeconds ?? 0);
}

/** "18:30" or "6:30 PM", as the phone's own clock shows it. */
export function clockTime(isoInstant: string): string {
  return formatClockTime(new Date(isoInstant));
}
