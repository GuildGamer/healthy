/**
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
 * Push-ups: exit closer to enter so the tick fires earlier on the way up and
 * a compressed lock-out (reads ~0.5–0.55) still completes.
 */
export const QUICKPOSE_PUSHUP_EXIT_THRESHOLD = 0.55;
/** Ignore a second complete that arrives too soon (waving / bounce). */
export const QUICKPOSE_MIN_REP_INTERVAL_MS = 280;
/**
 * If the signal sits between exit and enter this long while entered, soft-
 * complete the rep so a compressed lock-out is not lost.
 */
export const QUICKPOSE_DEAD_ZONE_ABANDON_MS = 1_800;

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
  deadZoneAbandonMs?: number;
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
  readonly deadZoneAbandonMs: number;
  state: QuickPoseCountState = poseComplete(0);
  private lastCompleteAtMs = 0;
  private deadZoneSinceMs: number | null = null;

  constructor(options: QuickPoseThresholdCounterOptions = {}) {
    this.enterThreshold = options.enterThreshold ?? QUICKPOSE_ENTER_THRESHOLD;
    this.exitThreshold = options.exitThreshold ?? QUICKPOSE_EXIT_THRESHOLD;
    this.minIntervalMs = options.minIntervalMs ?? QUICKPOSE_MIN_REP_INTERVAL_MS;
    this.deadZoneAbandonMs = options.deadZoneAbandonMs ?? QUICKPOSE_DEAD_ZONE_ABANDON_MS;
  }

  count(value: number, nowMs = Date.now()): QuickPoseCountState {
    if (!this.state.isEntered && value > this.enterThreshold) {
      this.state = poseEntered(this.state.count);
      this.deadZoneSinceMs = null;
      return this.state;
    }

    if (this.state.isEntered && value < this.exitThreshold) {
      this.deadZoneSinceMs = null;
      return this.completeRep(nowMs);
    }

    if (this.state.isEntered) {
      this.maybeSoftCompleteDeadZone(value, nowMs);
    }

    return this.state;
  }

  reset(): void {
    this.state = poseComplete(0);
    this.lastCompleteAtMs = 0;
    this.deadZoneSinceMs = null;
  }

  private completeRep(nowMs: number): QuickPoseCountState {
    if (nowMs - this.lastCompleteAtMs < this.minIntervalMs) {
      return this.state;
    }

    this.lastCompleteAtMs = nowMs;
    this.state = poseComplete(this.state.count + 1);
    this.deadZoneSinceMs = null;
    return this.state;
  }

  /**
   * A compressed lock-out can sit forever between exit and enter. After the
   * window, count the rep anyway — they already reached the bottom — so the
   * next dip can arm without losing work.
   */
  private maybeSoftCompleteDeadZone(value: number, nowMs: number): void {
    const inDeadZone = value >= this.exitThreshold && value <= this.enterThreshold;
    if (!inDeadZone) {
      this.deadZoneSinceMs = null;
      return;
    }

    if (this.deadZoneSinceMs == null) {
      this.deadZoneSinceMs = nowMs;
      return;
    }

    if (nowMs - this.deadZoneSinceMs < this.deadZoneAbandonMs) {
      return;
    }

    this.completeRep(nowMs);
  }
}
