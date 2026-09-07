import { averagePoint, type PoseFrame } from './landmarks';
import {
  bodyExtent,
  hasPushupFraming,
  looksLikeCameraMotion,
  looksLikeRigidSceneShift,
  looksLikeStandingUp,
  meanLandmarkShift,
  shoulderMidpoint,
} from './pushup-form';
import {
  minSwingForBody,
  PushupRepMachine,
  type PushupRepPhase,
} from './pushup-rep-machine';
import { hasTorsoTracking } from './pushup-signals';
import { PosePointSmoother } from './smooth-keypoints';

export type PushupCounterPhase = 'up' | 'down';

export type PushupRejectReason =
  | 'none'
  | 'framing'
  | 'standing'
  | 'camera'
  | 'warmup';

export type PushupCounterSnapshot = {
  count: number;
  phase: PushupCounterPhase;
  downness: number;
  bodyInFrame: boolean;
  visibilityRatio: number;
  calibrating: boolean;
  calibrationProgress: number;
  movementRange: number;
  movementTooSmall: boolean;
  tooClose: boolean;
  rejectReason: PushupRejectReason;
  debugFrame: PoseFrame | null;
  /** Live QuickPose form prompt; unused on the MoveNet/guided path. */
  coachPrompt: string | null;
};

export type PushupCounterOptions = {
  minRepIntervalMs?: number;
  minLandmarkScore?: number;
  visibilityWindow?: number;
  signalSmoothAlpha?: number;
  keypointSmoothAlpha?: number;
  signalLossResetFrames?: number;
  visibilityWarmupFrames?: number;
};

const DEFAULTS = {
  minRepIntervalMs: 280,
  minLandmarkScore: 0.2,
  visibilityWindow: 30,
  signalSmoothAlpha: 0.72,
  keypointSmoothAlpha: 0.42,
  signalLossResetFrames: 8,
  visibilityWarmupFrames: 2,
} as const;

function uiPhase(phase: PushupRepPhase): PushupCounterPhase {
  return phase;
}

/**
 * Live push-up counter: MoveNet landmarks → shoulder height → first-rep
 * calibrated peak/valley machine. Safety gates freeze tracking; they do not
 * invent a second counter.
 */
export class PushupCounter {
  private readonly repMachine: PushupRepMachine;
  private readonly smoother = new PosePointSmoother();
  private readonly visibility: boolean[] = [];
  private readonly options: Required<PushupCounterOptions>;
  private smoothSignal = 0;
  private hasSignal = false;
  private bodyInFrame = false;
  private invisibleStreak = 0;
  private previousFrame: PoseFrame | null = null;
  private lastRejectedFrame: PoseFrame | null = null;
  private debugFrame: PoseFrame | null = null;
  private tooClose = false;
  private rejectReason: PushupRejectReason = 'none';
  private cameraFreezeStreak = 0;
  private standingStreak = 0;
  private framesSeen = 0;
  private sessionMin = Number.POSITIVE_INFINITY;
  private sessionMax = Number.NEGATIVE_INFINITY;

  constructor(options: PushupCounterOptions = {}) {
    this.options = { ...DEFAULTS, ...options };
    this.repMachine = new PushupRepMachine({
      minRepIntervalMs: this.options.minRepIntervalMs,
    });
  }

  reset(): void {
    this.repMachine.reset();
    this.smoother.reset();
    this.visibility.length = 0;
    this.smoothSignal = 0;
    this.hasSignal = false;
    this.bodyInFrame = false;
    this.invisibleStreak = 0;
    this.previousFrame = null;
    this.lastRejectedFrame = null;
    this.debugFrame = null;
    this.tooClose = false;
    this.rejectReason = 'none';
    this.cameraFreezeStreak = 0;
    this.standingStreak = 0;
    this.framesSeen = 0;
    this.sessionMin = Number.POSITIVE_INFINITY;
    this.sessionMax = Number.NEGATIVE_INFINITY;
  }

  snapshot(): PushupCounterSnapshot {
    const machine = this.repMachine.snapshot();
    const movementRange = this.sessionRange();
    const calibrating = !machine.calibrated && machine.count === 0;

    return {
      count: machine.count,
      phase: uiPhase(machine.phase),
      downness: machine.normalizedDepth,
      bodyInFrame: this.bodyInFrame,
      visibilityRatio: this.visibilityRatio(),
      calibrating,
      calibrationProgress: this.calibrationProgress(machine.typicalSwing),
      movementRange,
      movementTooSmall:
        !calibrating &&
        this.framesSeen > 30 &&
        movementRange < (machine.typicalSwing ?? 0.04),
      tooClose: this.tooClose,
      rejectReason: this.rejectReason,
      debugFrame: this.debugFrame,
      coachPrompt: null,
    };
  }

  ingest(frame: PoseFrame): PushupCounterSnapshot {
    const minScore = this.options.minLandmarkScore;
    const smoothed = this.smoother.smooth(
      frame,
      this.options.keypointSmoothAlpha,
    );
    this.debugFrame = smoothed;
    this.framesSeen += 1;

    const cameraJump = this.shouldFreezeForCamera(frame, minScore);
    if (cameraJump) {
      this.cameraFreezeStreak += 1;
      this.rejectReason = 'camera';
      const machine = this.repMachine.snapshot();
      const shoulder = shoulderMidpoint(frame, minScore);
      const largeBaselineShift =
        shoulder != null &&
        this.hasSignal &&
        Math.abs(shoulder.y - this.smoothSignal) >= 0.1;
      // Setup often begins while standing, then abruptly drops into plank.
      // Before we have any learned reps, treat that as a baseline change
      // instead of carrying an impossible old cycle top.
      if (machine.count === 0 && !machine.calibrated && largeBaselineShift) {
        this.repMachine.resetTracking();
        this.hasSignal = false;
      }
      // Keep counting through occasional jumpy frames. Only hard-freeze when
      // motion looks persistently handheld.
      if (this.cameraFreezeStreak >= 6) {
        this.freezeTracking({ clearPrevious: false });
        return this.snapshot();
      }
    } else {
      this.cameraFreezeStreak = 0;
    }

    const torsoVisible = hasTorsoTracking(frame, minScore);
    const framingOk = hasPushupFraming(frame, minScore);
    this.tooClose = torsoVisible && !framingOk;
    this.bodyInFrame = framingOk;
    this.pushVisibility(framingOk);

    const shoulder = shoulderMidpoint(frame, minScore);
    if (!framingOk || shoulder == null) {
      this.rejectReason = 'framing';
      this.noteSignalLoss();
      return this.snapshot();
    }

    if (looksLikeStandingUp(frame, minScore)) {
      this.standingStreak += 1;
      this.rejectReason = 'standing';
      if (this.standingStreak >= 4) {
        this.freezeTracking({ clearPrevious: true });
        return this.snapshot();
      }
    } else {
      this.standingStreak = 0;
    }

    this.previousFrame = frame;
    this.invisibleStreak = 0;
    this.rejectReason = 'none';
    const signal = this.smoothShoulderY(shoulder.y);
    this.sessionMin = Math.min(this.sessionMin, signal);
    this.sessionMax = Math.max(this.sessionMax, signal);

    if (this.visibility.length < this.options.visibilityWarmupFrames) {
      this.rejectReason = 'warmup';
      return this.snapshot();
    }

    const minSwing = minSwingForBody(bodyExtent(frame, minScore));
    this.repMachine.advance(frame.timestampMs, signal, minSwing);
    return this.snapshot();
  }

  private looksLikeHandheldJump(
    current: PoseFrame,
    previous: PoseFrame | null,
    minScore: number,
  ): boolean {
    const shift = meanLandmarkShift(current, previous, minScore);
    return (
      looksLikeCameraMotion(shift) ||
      looksLikeRigidSceneShift(current, previous, minScore)
    );
  }

  private shouldFreezeForCamera(
    frame: PoseFrame,
    minScore: number,
  ): boolean {
    const jump = this.looksLikeHandheldJump(frame, this.previousFrame, minScore);
    this.previousFrame = frame;
    if (!jump) {
      this.lastRejectedFrame = null;
      return false;
    }

    this.lastRejectedFrame = frame;
    return true;
  }

  private freezeTracking(options: { clearPrevious: boolean }): void {
    this.repMachine.resetTracking();
    this.hasSignal = false;
    this.smoother.reset();
    if (options.clearPrevious) {
      this.previousFrame = null;
      this.lastRejectedFrame = null;
    }
  }

  private noteSignalLoss(): void {
    this.invisibleStreak += 1;
    if (this.invisibleStreak < this.options.signalLossResetFrames) {
      return;
    }

    this.freezeTracking({ clearPrevious: true });
    this.invisibleStreak = 0;
  }

  private smoothShoulderY(rawY: number): number {
    if (!this.hasSignal) {
      this.hasSignal = true;
      this.smoothSignal = rawY;
      return rawY;
    }

    const alpha = this.options.signalSmoothAlpha;
    this.smoothSignal = alpha * rawY + (1 - alpha) * this.smoothSignal;
    return this.smoothSignal;
  }

  private sessionRange(): number {
    if (
      !Number.isFinite(this.sessionMin) ||
      !Number.isFinite(this.sessionMax)
    ) {
      return 0;
    }

    return Math.max(0, this.sessionMax - this.sessionMin);
  }

  private calibrationProgress(typicalSwing: number | null): number {
    if (typicalSwing != null) {
      return 1;
    }

    return Math.min(1, this.sessionRange() / 0.05);
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

    return this.visibility.filter(Boolean).length / this.visibility.length;
  }
}

export function shouldersVisible(
  frame: PoseFrame,
  minScore = 0.35,
): boolean {
  const left = frame.points.leftShoulder;
  const right = frame.points.rightShoulder;
  return (
    averagePoint(
      left && left.score >= minScore ? left : undefined,
      right && right.score >= minScore ? right : undefined,
    ) !== null
  );
}
