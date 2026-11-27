import type { CatalogChallenge } from '@product/client';
import { deckCardKindFor } from '@/components/deck';
import { formatClockTime } from '@/lib/clock-time';
import {
  REMINDER_MOMENT_BY_ID,
  REMINDER_MOMENTS,
  type ReminderMoment,
  SUGGESTED_MOMENT_BY_ICON,
  SUGGESTED_MOMENT_BY_KIND,
} from './constants/reminder-moments';

type MomentChallenge = Pick<CatalogChallenge, 'icon' | 'category' | 'completionKind' | 'capture'>;

export function momentAt(minuteOfDay: number): ReminderMoment | null {
  return REMINDER_MOMENTS.find((moment) => moment.minuteOfDay === minuteOfDay) ?? null;
}

/** "After lunch, 12:30" for a moment, or just the time for any other, on the phone's clock. */
export function reminderLabel(minuteOfDay: number): string {
  const moment = momentAt(minuteOfDay);
  const time = formatClockTime(minuteOfDay);
  return moment ? `${moment.label}, ${time}` : time;
}

/** The moment that suits a challenge: morning for medication, after lunch for a walk. */
export function suggestedMoment(challenge: MomentChallenge): ReminderMoment {
  const id =
    SUGGESTED_MOMENT_BY_ICON[challenge.icon] ??
    SUGGESTED_MOMENT_BY_KIND[deckCardKindFor(challenge)];
  return REMINDER_MOMENT_BY_ID[id];
}
