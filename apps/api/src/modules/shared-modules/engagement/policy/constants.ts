import { HABIT_SLOT_MINUTES } from '../constants/habit-slot-copy.js';
import type { EngagementSource } from '../enums/engagement-source.js';

/**
 * Retired: treatment used three waking-day slots. Cadence now always uses
 * HOLDOUT_HABIT_SLOT_MINUTES. Kept so older tests/imports compile.
 */
export const TREATMENT_HABIT_SLOT_MINUTES = [
  8 * 60, // 8:00
  14 * 60, // 14:00
  19 * 60, // 19:00
] as const;

/** Six waking-day habit slots — the only schedule cadence uses. */
export const HOLDOUT_HABIT_SLOT_MINUTES = HABIT_SLOT_MINUTES;

/** Retired: treatment daily cap. Cadence sources are never capped. */
export const CADENCE_DAILY_BUDGET = 3;

/** Retired: treatment quiet hours. Cadence no longer suppresses by clock. */
export const QUIET_HOURS_START_MINUTE = 21 * 60;
export const QUIET_HOURS_END_MINUTE = 8 * 60;

/** Retired: treatment skip-if-active window. Habit slots always fire. */
export const RECENT_ACTIVITY_LOOKBACK_MS = 2 * 60 * 60 * 1000;

/** History window for “usual completion hour” lead picking. */
export const LEAD_COMPLETION_LOOKBACK_DAYS = 30;

/**
 * Habit / clock / nudge delivery sources. Never daily-capped.
 * Group board-move burst control is separate (group-board-push-policy).
 */
export const CADENCE_ENGAGEMENT_SOURCES = [
  'habit_slot',
  'clock_reminder',
  'in_progress_nudge',
] as const satisfies readonly EngagementSource[];

export type CadenceEngagementSource = (typeof CADENCE_ENGAGEMENT_SOURCES)[number];

export const HABITS_PUSH_THREAD_ID = 'habits';
export const HABITS_PUSH_CHANNEL_ID = 'habits';
