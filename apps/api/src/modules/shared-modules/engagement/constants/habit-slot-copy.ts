/** Local minutes past midnight for the waking-day habit CTAs. */
export const HABIT_SLOT_MINUTES = [
  8 * 60, // 8:00
  11 * 60, // 11:00
  14 * 60, // 14:00
  17 * 60, // 17:00
  19 * 60, // 19:00
  21 * 60, // 21:00
] as const;

export type HabitSlotMinute = (typeof HABIT_SLOT_MINUTES)[number];

export type HabitSlotCopy = {
  title: string;
  body: string;
};

const HABIT_SLOT_COPY: Record<HabitSlotMinute, HabitSlotCopy> = {
  [8 * 60]: {
    title: "Start today's challenge",
    body: "Today's on you",
  },
  [11 * 60]: {
    title: 'Do one now',
    body: 'Got a few minutes?',
  },
  [14 * 60]: {
    title: 'Do one now',
    body: 'One challenge is still open',
  },
  [17 * 60]: {
    title: 'Keep your streak going',
    body: 'One challenge still open',
  },
  [19 * 60]: {
    title: 'Keep your streak going',
    body: 'One challenge still open',
  },
  [21 * 60]: {
    title: 'Do it before the day ends',
    body: 'Still time today',
  },
};

export function habitSlotCopy(minuteOfDay: number): HabitSlotCopy | null {
  if (!isHabitSlotMinute(minuteOfDay)) {
    return null;
  }

  return HABIT_SLOT_COPY[minuteOfDay] ?? null;
}

export function isHabitSlotMinute(
  minuteOfDay: number,
): minuteOfDay is HabitSlotMinute {
  return (HABIT_SLOT_MINUTES as readonly number[]).includes(minuteOfDay);
}

export function habitSlotIdempotencyKey(
  userId: string,
  dayKey: string,
  minuteOfDay: number,
): string {
  return `habit_slot:${userId}:${dayKey}:${minuteOfDay}`;
}

export const CHALLENGE_REMINDER_PUSH_TITLE = 'Do one now';

export const IN_PROGRESS_NUDGE_PUSH_TITLE = 'Finish it';
export const IN_PROGRESS_NUDGE_PUSH_BODY =
  'You started this. Keep your streak.';
