import type { StandingEvent } from './match-standings.js';

/**
 * Who moved the board on `dayKey`. Built from the same events the standings
 * fold, so the today strip can never light a face the score did not count.
 * Pending members are left out even if an event of theirs slips through.
 */
export function doneTodayUserIds(
  events: readonly StandingEvent[],
  acceptedUserIds: ReadonlySet<string>,
  dayKey: string,
): Set<string> {
  const done = new Set<string>();

  for (const event of events) {
    if (event.dayKey === dayKey && acceptedUserIds.has(event.userId)) {
      done.add(event.userId);
    }
  }

  return done;
}
