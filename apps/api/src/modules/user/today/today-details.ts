import {
  isDeviceCapture,
  type ChallengeTarget,
  type TodayOccurrenceDetail,
} from '@product/contract';
import type { DueOccurrence, MeasuredSession, TodayDetailsInput } from './types/today-details.js';

const SECONDS_PER_MINUTE = 60;

/** A session in the unit the target counts, or null when the target counts nothing. */
export function measuredAmount(session: MeasuredSession, target: ChallengeTarget): number | null {
  if (target.durationMinutes !== null) {
    return Math.floor((session.durationSeconds ?? 0) / SECONDS_PER_MINUTE);
  }

  if (target.count !== null) {
    return session.count ?? 0;
  }

  if (target.distanceMeters !== null) {
    return session.distanceMeters ?? 0;
  }

  return null;
}

function sessionsOfActivity(
  occurrence: DueOccurrence,
  sessions: readonly MeasuredSession[],
): MeasuredSession[] {
  const { metric } = occurrence.capture;
  if (!metric || !isDeviceCapture(occurrence.capture.kind)) {
    return [];
  }

  return sessions.filter((session) => session.metric === metric);
}

function bestMeasuredInPeriod(
  occurrence: DueOccurrence,
  sessions: readonly MeasuredSession[],
  dayKey: string,
): number | null {
  const amounts = sessionsOfActivity(occurrence, sessions)
    .filter((session) => session.dayKey >= occurrence.periodKey && session.dayKey <= dayKey)
    .map((session) => measuredAmount(session, occurrence.capture.target))
    .filter((amount): amount is number => amount !== null);

  return amounts.length > 0 ? Math.max(...amounts) : null;
}

function activeDayKeys(
  occurrence: DueOccurrence,
  input: Pick<TodayDetailsInput, 'completedDayKeysByChallenge' | 'sessions'>,
  week: { start: string; end: string },
): string[] {
  const days = new Set(input.completedDayKeysByChallenge.get(occurrence.challengeId) ?? []);
  for (const session of sessionsOfActivity(occurrence, input.sessions)) {
    days.add(session.dayKey);
  }

  return [...days].filter((day) => day >= week.start && day <= week.end).sort();
}

/** Derives every card's details from rows read once for the whole of Today. */
export function buildOccurrenceDetails(input: TodayDetailsInput): TodayOccurrenceDetail[] {
  const week = { start: input.weekStartKey, end: input.dayKey };

  return input.occurrences.map((occurrence) => ({
    userChallengeId: occurrence.id,
    lastCompletedDayKey: input.lastCompletedDayKeyByChallenge.get(occurrence.challengeId) ?? null,
    bestMeasuredInPeriod: bestMeasuredInPeriod(occurrence, input.sessions, input.dayKey),
    activeDayKeys: activeDayKeys(occurrence, input, week),
    completedAt: occurrence.completedAt?.toISOString() ?? null,
  }));
}
