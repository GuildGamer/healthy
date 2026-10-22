import {
  MATCH_DAY_STRIP_MAX_DAYS,
  type MatchDayStrip,
  type MatchScoringMode,
} from '@product/contract';
import { dayKeyFor, shiftDayKey } from '../../../shared/utils/day-key.js';
import type { StandingEvent } from './match-standings.js';

const DAY_MS = 86_400_000;

type DayStripInput = {
  scoringMode: MatchScoringMode;
  startsAt: Date;
  endsAt: Date;
  timeZone: string;
  now: Date;
};

/**
 * The calendar days a short streak contest covers, in its own zone. A week
 * that starts mid-morning touches eight dates, and every one of them can
 * earn a day, so every one gets a square. Longer contests keep the number.
 */
export function dayStripFor(input: DayStripInput): MatchDayStrip | null {
  const lengthDays = Math.round((input.endsAt.getTime() - input.startsAt.getTime()) / DAY_MS);
  if (input.scoringMode !== 'days_completed' || lengthDays > MATCH_DAY_STRIP_MAX_DAYS) {
    return null;
  }

  const firstKey = dayKeyFor(input.timeZone, input.startsAt);
  const lastKey = dayKeyFor(input.timeZone, new Date(input.endsAt.getTime() - 1));
  const dayKeys = [firstKey];
  while (dayKeys[dayKeys.length - 1] !== lastKey && dayKeys.length <= MATCH_DAY_STRIP_MAX_DAYS) {
    dayKeys.push(shiftDayKey(firstKey, dayKeys.length));
  }

  return { dayKeys, todayKey: dayKeyFor(input.timeZone, input.now) };
}

/**
 * Which strip days each accepted member moved the board on, from the events
 * the standings already folded. Days only: nothing about what earned them.
 */
export function movedDayKeysByUser(
  events: readonly StandingEvent[],
  acceptedUserIds: ReadonlySet<string>,
  strip: MatchDayStrip,
): Map<string, string[]> {
  const stripDays = new Set(strip.dayKeys);
  const daysByUser = new Map<string, Set<string>>();

  for (const event of events) {
    if (!acceptedUserIds.has(event.userId) || !stripDays.has(event.dayKey)) {
      continue;
    }

    const days = daysByUser.get(event.userId) ?? new Set<string>();
    days.add(event.dayKey);
    daysByUser.set(event.userId, days);
  }

  return new Map(
    [...daysByUser].map(([userId, days]) => [
      userId,
      strip.dayKeys.filter((dayKey) => days.has(dayKey)),
    ]),
  );
}
