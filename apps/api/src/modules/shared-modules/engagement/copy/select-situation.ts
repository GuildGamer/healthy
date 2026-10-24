import type { ReminderContext, ReminderSituation } from './types.js';

/**
 * Priority: awaiting_evidence → in_progress_* → missed_yesterday →
 * first_week → time-of-day habit situations → open_default.
 */
export function selectSituation(context: ReminderContext): ReminderSituation {
  if (context.nudgeKind === 'in_progress_nudge') {
    if (context.lead?.status === 'awaiting_evidence') {
      return 'awaiting_evidence';
    }

    const measured = context.lead?.measuredCount ?? 0;
    const target = context.lead?.targetCount;
    if (
      target != null &&
      target > 0 &&
      measured > 0 &&
      measured < target
    ) {
      return 'in_progress_partial';
    }

    return 'in_progress_none';
  }

  if (context.missedYesterday) {
    return 'missed_yesterday';
  }

  if (context.firstWeek) {
    return 'first_week';
  }

  const hour = Math.floor(context.localMinute / 60);

  if (context.nudgeKind === 'habit_slot' && hour < 12 && context.doneCount === 0) {
    return 'morning_nothing_done';
  }

  if (
    context.nudgeKind === 'habit_slot' &&
    hour >= 12 &&
    hour < 17 &&
    context.doneCount >= 1 &&
    context.openCount >= 1
  ) {
    return 'midday_almost_done';
  }

  if (hour >= 17) {
    if (context.streakDays >= 1 && context.openCount >= 1) {
      return 'evening_streak';
    }

    return 'evening_open';
  }

  return 'open_default';
}
