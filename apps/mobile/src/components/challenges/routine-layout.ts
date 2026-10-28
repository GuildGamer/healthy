import type {
  CatalogChallenge,
  ChallengeFrequency,
  TodayChallenge,
  TodayOccurrenceDetail,
} from '@product/client';
import { compareChallengeCatalogOrder } from '@product/contract/challenge-sort';
import { dayKeyName, shiftDayKey } from '@/components/home/day-keys';
import { formatClockTime } from '@/lib/clock-time';
import { challengeGoal, goalProgressLabel } from './challenge-goal';
import { frequencyOptions } from './constants/frequency-labels';
import { ROUTINE_COPY } from './constants/routine-copy';
import type { RoutineGroup, RoutineLayout, RoutineRow, RoutineState } from './types/routine';
import { waterGlassCount, waterGlassGoal } from './water-glasses';

type RoutineInput = {
  catalog: readonly CatalogChallenge[];
  occurrences: readonly TodayChallenge[];
  details: readonly TodayOccurrenceDetail[];
};

/** What you have signed up for, by rhythm. Doing happens on Today, so nothing here is a button. */
export function buildRoutine({ catalog, occurrences, details }: RoutineInput): RoutineLayout {
  const enrolled = catalog
    .filter((challenge) => challenge.isEnrolled)
    .sort(compareChallengeCatalogOrder);
  const occurrenceByChallenge = new Map(occurrences.map((item) => [item.challengeId, item]));
  const detailByOccurrence = new Map(details.map((item) => [item.userChallengeId, item]));

  const rowFor = (challenge: CatalogChallenge): RoutineRow => {
    const occurrence = occurrenceByChallenge.get(challenge.challengeId) ?? null;
    const detail = occurrence ? (detailByOccurrence.get(occurrence.id) ?? null) : null;
    const state = routineState(occurrence, detail);
    return {
      challenge,
      occurrence,
      state,
      meta: routineMeta(challenge, occurrence, detail, state),
    };
  };

  const active = enrolled.filter((challenge) => !challenge.isLocked);
  const groups = frequencyOptions
    .map((frequency): RoutineGroup => {
      const rows = active.filter((challenge) => challenge.frequency === frequency).map(rowFor);
      return { frequency, rows, doneCount: rows.filter((row) => row.state === 'done').length };
    })
    .filter((group) => group.rows.length > 0);

  return {
    groups,
    paused: enrolled.filter((challenge) => challenge.isLocked),
    isEmpty: enrolled.length === 0,
  };
}

/** This period's standing: nothing yet, part-way, or done. */
export function routineState(
  occurrence: TodayChallenge | null,
  detail: TodayOccurrenceDetail | null,
): RoutineState {
  if (!occurrence) {
    return 'open';
  }

  if (occurrence.status === 'completed') {
    return 'done';
  }

  // A photo still outstanding is not finished, even when the measure already hits.
  if (occurrence.status === 'awaiting_evidence') {
    return 'part';
  }

  if (goalIsMet(occurrence, detail)) {
    return 'done';
  }

  const hasStarted =
    occurrence.status === 'in_progress' ||
    occurrence.progress.filled > 0 ||
    (occurrence.completionKind === 'water' && waterGlassCount(occurrence) > 0) ||
    (detail?.bestMeasuredInPeriod ?? 0) > 0;

  return hasStarted ? 'part' : 'open';
}

/** Same bar Today's ring uses: measured progress has reached the goal. */
function goalIsMet(
  occurrence: TodayChallenge,
  detail: TodayOccurrenceDetail | null,
): boolean {
  if (occurrence.completionKind === 'water') {
    return waterGlassCount(occurrence) >= waterGlassGoal(occurrence);
  }

  const goal = challengeGoal(occurrence);
  if (!goal) {
    return false;
  }

  return (detail?.bestMeasuredInPeriod ?? 0) >= goal.amount;
}

function routineMeta(
  challenge: CatalogChallenge,
  occurrence: TodayChallenge | null,
  detail: TodayOccurrenceDetail | null,
  state: RoutineState,
): string {
  if (occurrence && state === 'done') {
    return doneMeta(occurrence, detail?.completedAt ?? null);
  }

  if (occurrence?.status === 'awaiting_evidence') {
    return ROUTINE_COPY.photoWaiting;
  }

  const reminder = firstReminderTime(challenge);
  const progress = occurrence && state === 'part' ? progressMeta(occurrence, detail) : null;
  if (progress) {
    return reminder ? `${progress} · ${ROUTINE_COPY.reminder.toLowerCase()} ${reminder}` : progress;
  }

  return openMeta(challenge.frequency, occurrence, reminder);
}

function doneMeta(occurrence: TodayChallenge, completedAt: string | null): string {
  if (occurrence.completionKind === 'water') {
    return `${ROUTINE_COPY.done} · ${waterGlassGoal(occurrence)} glasses`;
  }

  if (!completedAt) {
    return ROUTINE_COPY.done;
  }

  return `${ROUTINE_COPY.done} ${completedWhen(occurrence.frequency, new Date(completedAt))}`;
}

function completedWhen(frequency: ChallengeFrequency, at: Date): string {
  if (frequency === 'daily') {
    return `at ${formatClockTime(at)}`;
  }

  if (frequency === 'weekly') {
    return at.toLocaleDateString('en-GB', { weekday: 'long' });
  }

  return at.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}

function progressMeta(
  occurrence: TodayChallenge,
  detail: TodayOccurrenceDetail | null,
): string | null {
  if (occurrence.completionKind === 'water') {
    return `${waterGlassCount(occurrence)} of ${waterGlassGoal(occurrence)} glasses`;
  }

  const goal = challengeGoal(occurrence);
  const measured = detail?.bestMeasuredInPeriod ?? 0;
  if (goal && measured > 0) {
    return goalProgressLabel(measured, goal);
  }

  const { filled, required } = occurrence.progress;
  return filled > 0 && required > 1 ? `${filled} of ${required} entered` : null;
}

function openMeta(
  frequency: ChallengeFrequency,
  occurrence: TodayChallenge | null,
  reminder: string | null,
): string {
  if (frequency !== 'daily' && occurrence) {
    return `${ROUTINE_COPY.dueBy} ${periodEndLabel(frequency, occurrence.periodKey)}`;
  }

  if (reminder) {
    return `${ROUTINE_COPY.reminder} ${reminder}`;
  }

  return ROUTINE_COPY.notYetToday;
}

/** "Sunday" for a week opening on a Monday, "31 October" for a month opening on the 1st. */
export function periodEndLabel(frequency: ChallengeFrequency, periodKey: string): string {
  if (frequency === 'weekly') {
    return dayKeyName(shiftDayKey(periodKey, 6), 'weekday');
  }

  const [year, month] = periodKey.split('-').map(Number);
  if (!year || !month) {
    return periodKey;
  }

  const lastDay = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return dayKeyName(lastDay, 'date');
}

function firstReminderTime(challenge: CatalogChallenge): string | null {
  const minutes = challenge.reminders.map((reminder) => reminder.minuteOfDay);
  return minutes.length > 0 ? formatClockTime(Math.min(...minutes)) : null;
}
