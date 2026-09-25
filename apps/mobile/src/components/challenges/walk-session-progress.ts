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
  /** HUD readout, e.g. `02:14 / 10:00`. */
  readout: string;
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
      readout: `${formatDuration(progress.elapsedSeconds)} / ${formatDuration(targetSeconds)}`,
      remaining:
        remainingSeconds > 0 ? `${formatDuration(remainingSeconds)} more` : null,
    });
  }

  if (target.distanceMeters !== null) {
    const remainingMeters = target.distanceMeters - progress.distanceMeters;
    requirements.push({
      ratio: clampRatio(progress.distanceMeters / target.distanceMeters),
      readout: `${formatDistance(progress.distanceMeters)} / ${formatDistance(target.distanceMeters)}`,
      remaining:
        remainingMeters > 0 ? `${formatDistance(remainingMeters)} more` : null,
    });
  }

  return requirements;
}

/** The worst-off requirement drives the bar, since every target must be met. */
export function walkProgressRatio(
  progress: WalkProgress,
  target: ChallengeTarget,
): number | null {
  const ratios = walkRequirements(progress, target).map(
    (requirement) => requirement.ratio,
  );

  return ratios.length === 0 ? null : Math.min(...ratios);
}

/** Large HUD line: the targeted metrics, or bare elapsed time when untargeted. */
export function walkReadout(
  progress: WalkProgress,
  target: ChallengeTarget,
): string {
  const readouts = walkRequirements(progress, target).map(
    (requirement) => requirement.readout,
  );

  return readouts.length === 0
    ? formatDuration(progress.elapsedSeconds)
    : readouts.join('  ·  ');
}

/**
 * The measurement the goal readout leaves out, so a walker always sees both
 * time and distance. Null when the goal already covers the two of them.
 */
export function walkSecondaryStat(
  progress: WalkProgress,
  target: ChallengeTarget,
): string | null {
  if (target.distanceMeters === null) {
    return formatDistance(progress.distanceMeters);
  }

  if (target.durationMinutes === null) {
    return formatDuration(progress.elapsedSeconds);
  }

  return null;
}

/** Tells the walker exactly what is left. Null once the walk would count. */
export function walkShortfall(
  progress: WalkProgress,
  target: ChallengeTarget,
): string | null {
  const remaining = walkRequirements(progress, target)
    .map((requirement) => requirement.remaining)
    .filter((value): value is string => value !== null);

  if (remaining.length === 0) {
    return null;
  }

  return `${remaining.join(' and ')} to finish`;
}

function clampRatio(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.min(value, 1);
}
