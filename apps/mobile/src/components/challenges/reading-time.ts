import { formatClockTime } from '@/lib/clock-time';

/** "08:10" or "8:10 AM", the moment a reading is taken. */
export function clockLabel(at: Date): string {
  return formatClockTime(at);
}

/** "Thursday", for the corner of a share image. */
export function weekdayName(at: Date): string {
  return at.toLocaleDateString('en-GB', { weekday: 'long' });
}

/** "Now, 08:10": the time is taken for you, so the sheet just says it. */
export function nowLabel(at: Date): string {
  return `Now, ${clockLabel(at)}`;
}

/** "Lunch, 13:05": carbs are logged against a meal, guessed from the hour. */
export function mealLabel(at: Date): string {
  const hour = at.getHours();
  if (hour < 11) {
    return `Breakfast, ${clockLabel(at)}`;
  }

  if (hour < 16) {
    return `Lunch, ${clockLabel(at)}`;
  }

  return `Dinner, ${clockLabel(at)}`;
}
