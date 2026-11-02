import { isPoseMetric, MATCH_METRIC_MEASURE, type MatchMetric } from './match-board.js';

/** Singular / plural nouns for “Do N …” challenge titles. */
const POSE_TITLE_UNIT: Record<
  Exclude<MatchMetric, 'walk'>,
  { one: string; many: string }
> = {
  pushups: { one: 'push-up', many: 'push-ups' },
  squats: { one: 'squat', many: 'squats' },
  plank: { one: 'second', many: 'seconds' },
  jumping_jacks: { one: 'jumping jack', many: 'jumping jacks' },
  burpees: { one: 'burpee', many: 'burpees' },
  sit_ups: { one: 'sit-up', many: 'sit-ups' },
  mountain_climbers: { one: 'mountain climber', many: 'mountain climbers' },
  lunges: { one: 'lunge', many: 'lunges' },
};

/** @deprecated Prefer formatPoseChallengeTitle — kept for existing call sites. */
export function formatPushupChallengeTitle(count: number): string {
  return formatPoseChallengeTitle('pushups', count);
}

/** Countable pose goals read as “Do N push-ups”, “Do N squats”, …. */
export function formatPoseChallengeTitle(
  metric: Exclude<MatchMetric, 'walk'>,
  count: number,
): string {
  const unit = POSE_TITLE_UNIT[metric];
  const noun = count === 1 ? unit.one : unit.many;
  return `Do ${count} ${noun}`;
}

/**
 * Pose rep goals follow the member’s target. Hold metrics (plank) and
 * non-pose catalog titles stay as stored.
 */
export function displayChallengeTitle(input: {
  title: string;
  metric?: string | null;
  count?: number | null;
}): string {
  if (!input.metric || !isPoseMetric(input.metric)) {
    return input.title;
  }

  if (input.count == null || input.count <= 0) {
    return input.title;
  }

  // Plank and other holds keep catalog copy (“Hold a plank”), not “Do 60 seconds”.
  if (MATCH_METRIC_MEASURE[input.metric] !== 'reps') {
    return input.title;
  }

  return formatPoseChallengeTitle(input.metric, input.count);
}
