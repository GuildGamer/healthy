/**
 * Spec for native ThresholdCounter (Swift/Kotlin). Live counting runs in the
 * QuickPose module; keep these constants and hysteresis rules identical.
 *
 * 1:1 port of QuickPose's JS helper (`QuickPoseThresholdCounter`): a rep
 * completes when the feature value crosses enter (bottom) then exit (top).
 * That hysteresis is what stops half-reps from counting.
 *
 * Enter is stricter than QuickPose's published 0.6 default so a shallow dip
 * never arms. Exit stays low so they still have to lock out.
 */
export const QUICKPOSE_ENTER_THRESHOLD = 0.8;
export const QUICKPOSE_EXIT_THRESHOLD = 0.3;
/** Push-ups: slightly softer enter so good-form dips are not missed. */
export const QUICKPOSE_PUSHUP_ENTER_THRESHOLD = 0.7;
/**
 * Push-ups: exit a hair above the default so a real lock-out that still
 * reads ~0.32–0.34 completes. Keep well below enter so waving cannot finish.
 */
export const QUICKPOSE_PUSHUP_EXIT_THRESHOLD = 0.35;
/** Ignore a second complete that arrives too soon (waving / bounce). */
export const QUICKPOSE_MIN_REP_INTERVAL_MS = 280;

export type QuickPoseCountState =
  | {
      readonly type: 'poseEntered';
      readonly count: number;
      readonly isEntered: true;
    }
  | {
      readonly type: 'poseComplete';
      readonly count: number;
      readonly isEntered: false;
    };

export type QuickPoseThresholdCounterOptions = {
  enterThreshold?: number;
  exitThreshold?: number;
  minIntervalMs?: number;
};

function poseEntered(count: number): QuickPoseCountState {
  return { type: 'poseEntered', count, isEntered: true };
}

function poseComplete(count: number): QuickPoseCountState {
  return { type: 'poseComplete', count, isEntered: false };
}

export class QuickPoseThresholdCounter {
  readonly enterThreshold: number;
  readonly exitThreshold: number;
  readonly minIntervalMs: number;
  state: QuickPoseCountState = poseComplete(0);
  private lastCompleteAtMs = 0;

  constructor(options: QuickPoseThresholdCounterOptions = {}) {
    this.enterThreshold = options.enterThreshold ?? QUICKPOSE_ENTER_THRESHOLD;
    this.exitThreshold = options.exitThreshold ?? QUICKPOSE_EXIT_THRESHOLD;
    this.minIntervalMs = options.minIntervalMs ?? QUICKPOSE_MIN_REP_INTERVAL_MS;
  }

  count(value: number, nowMs = Date.now()): QuickPoseCountState {
    if (!this.state.isEntered && value > this.enterThreshold) {
      this.state = poseEntered(this.state.count);
    } else if (this.state.isEntered && value < this.exitThreshold) {
      if (nowMs - this.lastCompleteAtMs < this.minIntervalMs) {
        return this.state;
      }
      this.lastCompleteAtMs = nowMs;
      this.state = poseComplete(this.state.count + 1);
    }

    return this.state;
  }

  reset(): void {
    this.state = poseComplete(0);
    this.lastCompleteAtMs = 0;
  }
}
