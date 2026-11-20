import type { ChallengeTarget } from '@product/contract/challenge-capture';
import { formatDistance, formatDuration } from '@/lib/geo-session';

export type WalkProgress = {
  elapsedSeconds: number;
  distanceMeters: number;
};

/** One thing a walk is judged on. A challenge may set duration, distance, or both. */
export type WalkRequirement = {
  /** How far along this requirement is, clamped to 0..1. */
  ratio: number;
  /** What is still missing, e.g. `7:46 more`. Null once met. */
  remaining: string | null;
};

export function walkRequirements(
  progress: WalkProgress,
  target: ChallengeTarget,
): WalkRequirement[] {
  const requirements: WalkRequirement[] = [];

  if (target.durationMinutes !== null) {
    const targetSeconds = target.durationMinutes * 60;
    const remainingSeconds = targetSeconds - progress.elapsedSeconds;
    requirements.push({
      ratio: clampRatio(progress.elapsedSeconds / targetSeconds),
      remaining: remainingSeconds > 0 ? `${formatDuration(remainingSeconds)} more` : null,
    });
  }

  if (target.distanceMeters !== null) {
    const remainingMeters = target.distanceMeters - progress.distanceMeters;
    requirements.push({
      ratio: clampRatio(progress.distanceMeters / target.distanceMeters),
      remaining: remainingMeters > 0 ? `${formatDistance(remainingMeters)} more` : null,
    });
  }

  return requirements;
}

/** The worst-off requirement drives the bar, since every target must be met. */
export function walkProgressRatio(progress: WalkProgress, target: ChallengeTarget): number | null {
  const ratios = walkRequirements(progress, target).map((requirement) => requirement.ratio);

  return ratios.length === 0 ? null : Math.min(...ratios);
}

/** Tells the walker exactly what is left. Null once the walk would count. */
export function walkShortfall(progress: WalkProgress, target: ChallengeTarget): string | null {
  const remaining = walkRequirements(progress, target)
    .map((requirement) => requirement.remaining)
    .filter((value): value is string => value !== null);

  if (remaining.length === 0) {
    return null;
  }

  return `${remaining.join(' and ')} to finish`;
}

/** "4:12": a walk's clock as a watch shows it, without a leading zero. */
export function walkClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** The big number on a walk and what it is out of: time first, or distance when only that counts. */
export function walkHero(
  progress: WalkProgress,
  target: ChallengeTarget,
): { value: string; of: string | null } {
  if (target.durationMinutes !== null) {
    return {
      value: walkClock(progress.elapsedSeconds),
      of: `of ${walkClock(target.durationMinutes * 60)}`,
    };
  }

  if (target.distanceMeters !== null) {
    return {
      value: (progress.distanceMeters / 1_000).toFixed(2),
      of: `of ${formatDistance(target.distanceMeters)}`,
    };
  }

  return { value: walkClock(progress.elapsedSeconds), of: null };
}

/** "Goal 10 min", in the corner before a walk starts. */
export function walkGoalLabel(target: ChallengeTarget): string | null {
  if (target.durationMinutes !== null) {
    return `Goal ${target.durationMinutes} min`;
  }

  if (target.distanceMeters !== null) {
    return `Goal ${formatDistance(target.distanceMeters)}`;
  }

  return null;
}

function clampRatio(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.min(value, 1);
}
