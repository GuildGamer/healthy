import type { DeckCardKind } from '@/components/deck';
import type { GlyphName } from '@/components/icons';

export type ReminderMomentId = 'morning' | 'afterLunch' | 'evening' | 'beforeBed';

export type ReminderMoment = {
  id: ReminderMomentId;
  label: string;
  /** Local wall-clock minutes past midnight. */
  minuteOfDay: number;
  glyph: GlyphName;
};

export const REMINDER_MOMENT_BY_ID: Record<ReminderMomentId, ReminderMoment> = {
  morning: { id: 'morning', label: 'Morning', minuteOfDay: 8 * 60, glyph: 'today' },
  afterLunch: { id: 'afterLunch', label: 'After lunch', minuteOfDay: 12 * 60 + 30, glyph: 'today' },
  evening: { id: 'evening', label: 'Evening', minuteOfDay: 18 * 60, glyph: 'today' },
  beforeBed: { id: 'beforeBed', label: 'Before bed', minuteOfDay: 21 * 60 + 30, glyph: 'moon' },
};

/** Most nudges land at one of a few moments in the day, so those are offered first. */
export const REMINDER_MOMENTS: readonly ReminderMoment[] = [
  REMINDER_MOMENT_BY_ID.morning,
  REMINDER_MOMENT_BY_ID.afterLunch,
  REMINDER_MOMENT_BY_ID.evening,
  REMINDER_MOMENT_BY_ID.beforeBed,
];

export const SUGGESTED_MOMENT_BY_KIND: Record<DeckCardKind, ReminderMomentId> = {
  bloodPressure: 'morning',
  walk: 'afterLunch',
  water: 'morning',
  strength: 'evening',
  gym: 'evening',
  mobility: 'evening',
};

/** Challenges whose kind says little about their best moment, keyed by their catalogue mark. */
export const SUGGESTED_MOMENT_BY_ICON: Readonly<Record<string, ReminderMomentId>> = {
  pill: 'morning',
  lungs: 'morning',
  sleep: 'morning',
  'scale-bathroom': 'morning',
};

export const MOMENT_HINT: Record<ReminderMomentId, string> = {
  morning: 'This one fits well in the morning.',
  afterLunch: 'This one fits well after lunch.',
  evening: 'This one fits well in the evening.',
  beforeBed: 'This one fits well before bed.',
};
