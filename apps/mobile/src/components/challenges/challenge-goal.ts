import type { CatalogChallenge, DeviceMetric } from '@product/client';
import { durationGoalBounds } from '@product/contract/challenge-capture';
import { DURATION_GOAL_COPY, PUSHUP_GOAL_COPY, WALK_GOAL_COPY } from './constants/routine-copy';
import { PUSHUP_TARGET_MAX, PUSHUP_TARGET_MIN } from './pushup-target';

export type GoalRange = { min: number; max: number; quickPicks: readonly number[] };

/** How a goal is changed: its sheet's words and the numbers it offers. */
export type GoalEditor = {
  title: string;
  sub: string;
  range: GoalRange;
};

export type ChallengeGoal = {
  amount: number;
  /** Which enrolment field holds a person's own goal. */
  field: 'targetCount' | 'targetDurationMinutes';
  /** "push-ups", "minutes": after the full number on a settings row. */
  unit: string;
  /** "push-ups", "min": after "4 of 10" on a routine row. */
  shortUnit: string;
  /** Null when the goal is the catalogue's to set, such as a step count. */
  editor: GoalEditor | null;
};

const COUNT_UNIT: Partial<Record<DeviceMetric, string>> = {
  pushups: 'push-ups',
  steps: 'steps',
};

const PUSHUP_QUICK_PICKS = [10, 15, 20, 30] as const;
const MINUTE_QUICK_PICKS = [10, 15, 20, 30] as const;

type GoalChallenge = Pick<CatalogChallenge, 'capture' | 'completionKind'>;

function durationGoal(minutes: number, metric: DeviceMetric | null): ChallengeGoal {
  const copy = metric === 'walk' ? WALK_GOAL_COPY : DURATION_GOAL_COPY;
  return {
    amount: minutes,
    field: 'targetDurationMinutes',
    unit: minutes === 1 ? 'minute' : 'minutes',
    shortUnit: 'min',
    editor: { ...copy, range: { ...durationGoalBounds(minutes), quickPicks: MINUTE_QUICK_PICKS } },
  };
}

/** The amount a challenge asks for, or null when it asks for a reading or a tap. */
export function challengeGoal(challenge: GoalChallenge): ChallengeGoal | null {
  if (challenge.completionKind === 'water') {
    return null;
  }

  const { target, metric } = challenge.capture;
  if (target.durationMinutes !== null) {
    return durationGoal(target.durationMinutes, metric);
  }

  const countUnit = metric ? COUNT_UNIT[metric] : undefined;
  if (target.count === null || !countUnit) {
    return null;
  }

  const pushupEditor: GoalEditor = {
    ...PUSHUP_GOAL_COPY,
    range: { min: PUSHUP_TARGET_MIN, max: PUSHUP_TARGET_MAX, quickPicks: PUSHUP_QUICK_PICKS },
  };
  return {
    amount: target.count,
    field: 'targetCount',
    unit: countUnit,
    shortUnit: countUnit,
    editor: metric === 'pushups' ? pushupEditor : null,
  };
}

export function formatGoalAmount(amount: number): string {
  return amount.toLocaleString('en-GB');
}

/** "20 push-ups", "10 minutes". */
export function goalLabel(goal: Pick<ChallengeGoal, 'amount' | 'unit'>): string {
  return `${formatGoalAmount(goal.amount)} ${goal.unit}`;
}

/** "4 of 10 min", the best measured session against the goal. */
export function goalProgressLabel(measured: number, goal: ChallengeGoal): string {
  const shown = Math.min(measured, goal.amount);
  return `${formatGoalAmount(shown)} of ${formatGoalAmount(goal.amount)} ${goal.shortUnit}`;
}

/** The enrolment fields that save a person's own goal. */
export function goalPatch(
  field: ChallengeGoal['field'],
  amount: number,
): { targetCount: number } | { targetDurationMinutes: number } {
  return field === 'targetCount' ? { targetCount: amount } : { targetDurationMinutes: amount };
}

export function clampGoal(value: number, range: GoalRange): number {
  return Math.min(range.max, Math.max(range.min, Math.round(value)));
}
