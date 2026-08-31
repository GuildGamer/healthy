import { elbowDownness, jointAngleDegrees } from './elbow-angle';
import {
  averagePoint,
  type PoseFrame,
  type PosePoint,
} from './landmarks';

export type PushupCounterPhase = 'up' | 'down';

export type PushupCounterSnapshot = {
  count: number;
  phase: PushupCounterPhase;
  /** 0..1 flexion depth from the latest accepted frame. */
  downness: number;
  /** True when shoulders + at least one full arm chain are visible. */
  bodyInFrame: boolean;
  /** Share of recent frames with a usable arm signal (0..1). */
  visibilityRatio: number;
};

export type PushupCounterOptions = {
  /** Cross this going down to enter the bottom phase. */
  downThreshold?: number;
  /** Cross this going up to book a rep and return to top. */
  upThreshold?: number;
  /** Ignore reps faster than this (noise / bounce). */
  minRepDurationMs?: number;
  /** Landmark confidence required to trust a joint. */
  minLandmarkScore?: number;
  /** Rolling window used for visibilityRatio. */
  visibilityWindow?: number;
};

const DEFAULTS = {
  downThreshold: 0.7,
  upThreshold: 0.3,
  minRepDurationMs: 400,
  minLandmarkScore: 0.35,
  visibilityWindow: 30,
} as const;

/**
 * Deterministic push-up counter from pose landmarks.
 * Counts on a full UP → DOWN → UP cycle with hysteresis.
 */
export class PushupCounter {
  private count = 0;
  private phase: PushupCounterPhase = 'up';
  private downness = 0;
  private bodyInFrame = false;
  private lastPhaseChangeMs = 0;
  private readonly visibility: boolean[] = [];
  private readonly options: Required<PushupCounterOptions>;

  constructor(options: PushupCounterOptions = {}) {
    this.options = { ...DEFAULTS, ...options };
  }

  reset(): void {
    this.count = 0;
    this.phase = 'up';
    this.downness = 0;
    this.bodyInFrame = false;
    this.lastPhaseChangeMs = 0;
    this.visibility.length = 0;
  }

  snapshot(): PushupCounterSnapshot {
    return {
      count: this.count,
      phase: this.phase,
      downness: this.downness,
      bodyInFrame: this.bodyInFrame,
      visibilityRatio: this.visibilityRatio(),
    };
  }

  ingest(frame: PoseFrame): PushupCounterSnapshot {
    const signal = this.armSignal(frame);
    this.bodyInFrame = signal !== null;
    this.pushVisibility(signal !== null);

    if (!signal) {
      return this.snapshot();
    }

    this.downness = signal.downness;
    this.advancePhase(frame.timestampMs, signal.downness);
    return this.snapshot();
  }

  private armSignal(
    frame: PoseFrame,
  ): { downness: number } | null {
    const left = this.sideDownness(
      frame.points.leftShoulder,
      frame.points.leftElbow,
      frame.points.leftWrist,
    );
    const right = this.sideDownness(
      frame.points.rightShoulder,
      frame.points.rightElbow,
      frame.points.rightWrist,
    );

    if (left === null && right === null) {
      return null;
    }

    if (left !== null && right !== null) {
      return { downness: (left + right) / 2 };
    }

    return { downness: left ?? right ?? 0 };
  }

  private sideDownness(
    shoulder: PosePoint | undefined,
    elbow: PosePoint | undefined,
    wrist: PosePoint | undefined,
  ): number | null {
    if (!shoulder || !elbow || !wrist) {
      return null;
    }

    if (
      shoulder.score < this.options.minLandmarkScore ||
      elbow.score < this.options.minLandmarkScore ||
      wrist.score < this.options.minLandmarkScore
    ) {
      return null;
    }

    return elbowDownness(jointAngleDegrees(shoulder, elbow, wrist));
  }

  private advancePhase(timestampMs: number, downness: number): void {
    if (this.phase === 'up' && downness >= this.options.downThreshold) {
      this.phase = 'down';
      this.lastPhaseChangeMs = timestampMs;
      return;
    }

    if (this.phase !== 'down' || downness > this.options.upThreshold) {
      return;
    }

    const elapsed = timestampMs - this.lastPhaseChangeMs;
    this.phase = 'up';
    this.lastPhaseChangeMs = timestampMs;

    if (elapsed < this.options.minRepDurationMs) {
      return;
    }

    this.count += 1;
  }

  private pushVisibility(visible: boolean): void {
    this.visibility.push(visible);
    if (this.visibility.length > this.options.visibilityWindow) {
      this.visibility.shift();
    }
  }

  private visibilityRatio(): number {
    if (this.visibility.length === 0) {
      return 0;
    }

    const hits = this.visibility.filter(Boolean).length;
    return hits / this.visibility.length;
  }
}

/** True when shoulders are roughly visible for the calibration gate. */
export function shouldersVisible(
  frame: PoseFrame,
  minScore = 0.35,
): boolean {
  const left = frame.points.leftShoulder;
  const right = frame.points.rightShoulder;
  const shoulder = averagePoint(
    left && left.score >= minScore ? left : undefined,
    right && right.score >= minScore ? right : undefined,
  );
  return shoulder !== null;
}
