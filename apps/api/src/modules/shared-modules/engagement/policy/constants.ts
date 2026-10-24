import { HABIT_SLOT_MINUTES } from '../constants/habit-slot-copy.js';
import type { EngagementSource } from '../enums/engagement-source.js';

/** Treatment waking-day slots: morning, afternoon, evening. */
export const TREATMENT_HABIT_SLOT_MINUTES = [
  8 * 60, // 8:00
  14 * 60, // 14:00
  19 * 60, // 19:00
] as const;

export const HOLDOUT_HABIT_SLOT_MINUTES = HABIT_SLOT_MINUTES;

/** Shared daily cap for cadence pushes (treatment only). */
export const CADENCE_DAILY_BUDGET = 3;

/** Local minutes: quiet from 21:00 through 07:59 inclusive of the evening start. */
export const QUIET_HOURS_START_MINUTE = 21 * 60;
export const QUIET_HOURS_END_MINUTE = 8 * 60;

/** Skip a habit slot when the member was in-app this recently. */
export const RECENT_ACTIVITY_LOOKBACK_MS = 2 * 60 * 60 * 1000;

/** History window for “usual completion hour” lead picking. */
export const LEAD_COMPLETION_LOOKBACK_DAYS = 30;

export const CADENCE_ENGAGEMENT_SOURCES = [
  'habit_slot',
  'clock_reminder',
  'in_progress_nudge',
] as const satisfies readonly EngagementSource[];

export type CadenceEngagementSource = (typeof CADENCE_ENGAGEMENT_SOURCES)[number];

export const HABITS_PUSH_THREAD_ID = 'habits';
export const HABITS_PUSH_CHANNEL_ID = 'habits';
