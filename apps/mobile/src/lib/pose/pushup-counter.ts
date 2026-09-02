import {
  averagePoint,
  type PoseFrame,
} from './landmarks';
import {
  bestElbowReading,
  computePushupDepth,
  hasPushupFraming,
  looksLikeCameraMotion,
  looksLikeRigidSceneShift,
  looksLikeStandingUp,
  meanLandmarkShift,
  MIN_ELBOW_RANGE_DEG,
  MIN_WRIST_COMPRESSION_FOR_REP,
  repPassesVerticalCheck,
  shoulderLateralOffset,
  shoulderMidpoint,
  shoulderVerticalDrop,
} from './pushup-form';
import { PushupRepMachine, type PushupRepPhase } from './pushup-rep-machine';
import {
  rawWristCompression,
  hasTorsoTracking,
  mergeCalibration,
  MIN_FUSED_MOVEMENT_RANGE,
  sampleCalibration,
  type PushupCalibration,
} from './pushup-signals';
import { PosePointSmoother } from './smooth-keypoints';

export type PushupCounterPhase = 'up' | 'down';

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
  debugFrame: PoseFrame | null;
};

export type PushupCounterOptions = {
  minRepIntervalMs?: number;
  minLandmarkScore?: number;
  visibilityWindow?: number;
  smoothAlpha?: number;
  keypointSmoothAlpha?: number;
  signalLossResetFrames?: number;
  minVisibilityRatio?: number;
  visibilityWarmupFrames?: number;
  calibrationFrames?: number;
  calibrationMaxAttempts?: number;
};

const DEFAULTS = {
  minRepIntervalMs: 320,
  minLandmarkScore: 0.2,
  visibilityWindow: 30,
  smoothAlpha: 0.9,
  keypointSmoothAlpha: 0.42,
  signalLossResetFrames: 30,
  minVisibilityRatio: 0.15,
  visibilityWarmupFrames: 2,
  calibrationFrames: 0,
  calibrationMaxAttempts: 45,
} as const;

function uiPhase(phase: PushupRepPhase): PushupCounterPhase {
  return phase === 'down' ? 'down' : 'up';
}

export class PushupCounter {
  private repMachine = new PushupRepMachine();
  private downness = 0;
  private smoothDepth = 0;
  private bodyInFrame = false;
  private invisibleStreak = 0;
  private calibration: PushupCalibration | null = null;
  private calibrationFramesSeen = 0;
  private calibrationAttempts = 0;
  private debugFrame: PoseFrame | null = null;
  private sessionMaxTorso = 0;
  private sessionMaxWrist = 0;
  private cycleElbowMin = 180;
  private cycleElbowMax = 0;
  private repCyclePeakVertical = 0;
  private repCyclePeakLateral = 0;
  private repCyclePeakWrist = 0;
  private previousFrame: PoseFrame | null = null;
  private cameraMotionStreak = 0;
  private framesSinceCalibration = 0;
  private oscValleyY = 1;
  private oscPeakY = 0;
  private oscArmed = false;
  private oscStaleFrames = 0;
  private tooClose = false;
  private readonly visibility: boolean[] = [];
  private readonly smoother = new PosePointSmoother();
  private readonly options: Required<PushupCounterOptions>;

  constructor(options: PushupCounterOptions = {}) {
    this.options = { ...DEFAULTS, ...options };
    this.repMachine = new PushupRepMachine({
      minRepIntervalMs: this.options.minRepIntervalMs,
    });
  }

  reset(): void {
    this.repMachine.reset();
    this.downness = 0;
    this.smoothDepth = 0;
    this.bodyInFrame = false;
    this.invisibleStreak = 0;
    this.calibration = null;
    this.calibrationFramesSeen = 0;
    this.calibrationAttempts = 0;
    this.debugFrame = null;
    this.sessionMaxTorso = 0;
    this.sessionMaxWrist = 0;
    this.resetRepCyclePeaks();
    this.previousFrame = null;
    this.cameraMotionStreak = 0;
    this.framesSinceCalibration = 0;
    this.resetOscillation();
    this.tooClose = false;
    this.visibility.length = 0;
    this.smoother.reset();
  }

  snapshot(): PushupCounterSnapshot {
    const machine = this.repMachine.snapshot();
    const movementRange = this.repMachine.depthRange();
    const learningRange = this.isLearningRange();

    return {
      count: machine.count,
      phase: uiPhase(machine.phase),
      downness: this.downness,
      bodyInFrame: this.bodyInFrame,
      visibilityRatio: this.visibilityRatio(),
      calibrating: learningRange,
      calibrationProgress: this.calibrationProgress(movementRange),
      movementRange,
      movementTooSmall:
        !learningRange &&
        this.framesSinceCalibration > 30 &&
        movementRange < MIN_FUSED_MOVEMENT_RANGE,
      tooClose: this.tooClose,
      debugFrame: this.debugFrame,
    };
  }

  ingest(frame: PoseFrame): PushupCounterSnapshot {
    const smoothed = this.smoother.smooth(
      frame,
      this.options.keypointSmoothAlpha,
    );
    this.debugFrame = smoothed;

    const previous = this.previousFrame;
    const landmarkShift = meanLandmarkShift(
      smoothed,
      previous,
      this.options.minLandmarkScore,
    );
    const rigidShift = looksLikeRigidSceneShift(
      smoothed,
      previous,
      this.options.minLandmarkScore,
    );
    this.previousFrame = smoothed;

    if (looksLikeCameraMotion(landmarkShift) || rigidShift) {
      this.cameraMotionStreak += 1;
      const rejectNow = rigidShift || this.cameraMotionStreak >= 2;
      if (rejectNow) {
        this.rejectHandheldMotion();
        return this.snapshot();
      }
    } else {
      this.cameraMotionStreak = 0;
    }

    if (this.legacyCalibrating()) {
      this.updateLegacyCalibration(smoothed);
    } else {
      this.framesSinceCalibration += 1;
    }

    this.bootstrapCalibration(frame);

    const torsoVisible = hasTorsoTracking(
      smoothed,
      this.options.minLandmarkScore,
    );
    const framingOk = hasPushupFraming(
      smoothed,
      this.options.minLandmarkScore,
    );
    this.tooClose = torsoVisible && !framingOk;
    const elbow = bestElbowReading(frame, this.options.minLandmarkScore);
    const depthSessionMax = {
      torso: Math.max(this.sessionMaxTorso, 0.04),
      wrist: Math.max(this.sessionMaxWrist, 0.02),
    };
    // Overlay stays smoothed; depth uses the raw frame so 8fps lag does not
    // shrink a real dip below the down band.
    const depthSample = computePushupDepth(
      frame,
      this.calibration,
      depthSessionMax,
      this.options.minLandmarkScore,
      elbow,
    );

    const repReady = depthSample != null && framingOk;
    this.bodyInFrame = framingOk;
    this.pushVisibility(this.bodyInFrame);

    if (!repReady) {
      this.invisibleStreak += 1;

      if (this.invisibleStreak >= this.options.signalLossResetFrames) {
        this.repMachine.resetTracking();
        this.smoothDepth *= 0.85;
        this.downness = this.smoothDepth;
        this.invisibleStreak = 0;
      }

      return this.snapshot();
    }

    this.invisibleStreak = 0;

    if (looksLikeStandingUp(frame, this.options.minLandmarkScore)) {
      this.rejectHandheldMotion();
      return this.snapshot();
    }

    if (elbow) {
      this.cycleElbowMin = Math.min(this.cycleElbowMin, elbow.angleDegrees);
      this.cycleElbowMax = Math.max(this.cycleElbowMax, elbow.angleDegrees);
    }

    const verticalDrop = shoulderVerticalDrop(
      frame,
      this.calibration,
      this.options.minLandmarkScore,
    );
    const lateralOffset = shoulderLateralOffset(
      frame,
      this.calibration,
      this.options.minLandmarkScore,
    );

    if (verticalDrop != null) {
      this.sessionMaxTorso = Math.max(this.sessionMaxTorso, verticalDrop);
    }

    const wristRaw = rawWristCompression(
      frame,
      this.calibration,
      this.options.minLandmarkScore,
    );
    if (wristRaw != null) {
      this.sessionMaxWrist = Math.max(this.sessionMaxWrist, wristRaw);
    }

    this.smoothDepth =
      this.options.smoothAlpha * depthSample +
      (1 - this.options.smoothAlpha) * this.smoothDepth;
    this.downness = this.smoothDepth;

    this.updateRepCyclePeaks(verticalDrop, lateralOffset, wristRaw);
    this.autoCalibrateAtTop(frame, depthSample);

    const canArm =
      this.cameraMotionStreak === 0 &&
      this.trackingIsStable() &&
      this.countingEnabled() &&
      this.repQualityOk();

    const machineBefore = this.repMachine.snapshot();
    this.repMachine.advance(frame.timestampMs, depthSample, canArm);
    const machineAfter = this.repMachine.snapshot();

    if (machineAfter.count > machineBefore.count) {
      this.resetRepCyclePeaks();
      this.resetOscillation();
    } else if (
      machineAfter.phase === 'up' &&
      !machineAfter.repArmed &&
      depthSample <= 0.42
    ) {
      this.resetRepCyclePeaks();
    }

    this.maybeCountShoulderOscillation(
      frame,
      frame.timestampMs,
      canArm,
      machineAfter.count > machineBefore.count,
    );

    return this.snapshot();
  }

  private resetRepCyclePeaks(): void {
    this.repCyclePeakVertical = 0;
    this.repCyclePeakLateral = 0;
    this.repCyclePeakWrist = 0;
    this.cycleElbowMin = 180;
    this.cycleElbowMax = 0;
  }

  private updateRepCyclePeaks(
    verticalDrop: number | null,
    lateralOffset: number | null,
    wristCompression: number | null,
  ): void {
    if (verticalDrop != null) {
      this.repCyclePeakVertical = Math.max(
        this.repCyclePeakVertical,
        verticalDrop,
      );
    }

    if (lateralOffset != null) {
      this.repCyclePeakLateral = Math.max(
        this.repCyclePeakLateral,
        lateralOffset,
      );
    }

    if (wristCompression != null) {
      this.repCyclePeakWrist = Math.max(
        this.repCyclePeakWrist,
        wristCompression,
      );
    }
  }

  private repQualityOk(): boolean {
    if (
      !repPassesVerticalCheck(
        this.repCyclePeakVertical,
        this.repCyclePeakLateral,
      )
    ) {
      return false;
    }

    const elbowSupportsRep = this.elbowRangeDegrees() >= MIN_ELBOW_RANGE_DEG;
    const wristSupportsRep =
      this.repCyclePeakWrist >= MIN_WRIST_COMPRESSION_FOR_REP;

    return elbowSupportsRep || wristSupportsRep;
  }

  private elbowRangeDegrees(): number {
    if (this.cycleElbowMax <= 0 || this.cycleElbowMin >= 180) {
      return 0;
    }

    return this.cycleElbowMax - this.cycleElbowMin;
  }

  private rejectHandheldMotion(): void {
    this.repMachine.resetTracking();
    this.resetRepCyclePeaks();
    this.resetOscillation();
    this.smoothDepth *= 0.7;
    this.downness = this.smoothDepth;
  }

  private bootstrapCalibration(frame: PoseFrame): void {
    if (this.calibration) {
      return;
    }

    if (!hasPushupFraming(frame, this.options.minLandmarkScore)) {
      return;
    }

    const minScore = this.options.minLandmarkScore;
    const sample = sampleCalibration(frame, minScore);
    if (sample) {
      this.calibration = sample;
      return;
    }

    const shoulder = shoulderMidpoint(frame, minScore);
    if (!shoulder) {
      return;
    }

    const nose = frame.points.nose;
    this.calibration = {
      topShoulderY: shoulder.y,
      topShoulderX: shoulder.x,
      topWristSpread: 0.12,
      topNoseY:
        nose != null && nose.score >= minScore * 0.8
          ? nose.y
          : shoulder.y - 0.08,
    };
  }

  private autoCalibrateAtTop(frame: PoseFrame, depth: number): void {
    if (this.framesSinceCalibration > 40) {
      return;
    }

    if (depth > 0.28 || !this.calibration) {
      return;
    }

    const sample = sampleCalibration(frame, this.options.minLandmarkScore);
    if (!sample) {
      return;
    }

    // Never climb to a higher-in-frame pose (standing). That freezes depth
    // at "down" for the whole plank set.
    if (sample.topShoulderY + 0.02 < this.calibration.topShoulderY) {
      return;
    }

    this.calibration = {
      ...this.calibration,
      topShoulderX: sample.topShoulderX,
      topWristSpread: Math.max(
        this.calibration.topWristSpread,
        sample.topWristSpread,
      ),
    };
  }

  private resetOscillation(): void {
    this.oscValleyY = 1;
    this.oscPeakY = 0;
    this.oscArmed = false;
    this.oscStaleFrames = 0;
  }

  private maybeCountShoulderOscillation(
    frame: PoseFrame,
    timestampMs: number,
    canArm: boolean,
    alreadyCounted: boolean,
  ): void {
    if (alreadyCounted) {
      return;
    }

    if (!hasPushupFraming(frame, this.options.minLandmarkScore)) {
      return;
    }

    const shoulder = shoulderMidpoint(frame, this.options.minLandmarkScore);
    if (!shoulder) {
      return;
    }

    if (!this.oscArmed) {
      this.oscValleyY = Math.min(this.oscValleyY, shoulder.y);
      if (shoulder.y > this.oscValleyY + 0.06) {
        this.oscStaleFrames += 1;
        if (this.oscStaleFrames >= 8) {
          this.oscValleyY = shoulder.y;
          this.oscStaleFrames = 0;
        }
      } else {
        this.oscStaleFrames = 0;
      }

      const drop = shoulder.y - this.oscValleyY;
      if (canArm && drop >= 0.024 && drop <= 0.12) {
        this.oscArmed = true;
        this.oscPeakY = shoulder.y;
        this.oscStaleFrames = 0;
      }
      return;
    }

    this.oscPeakY = Math.max(this.oscPeakY, shoulder.y);
    const excursion = this.oscPeakY - this.oscValleyY;
    const returned =
      shoulder.y <= this.oscPeakY - 0.014 &&
      shoulder.y <= this.oscValleyY + excursion * 0.5;

    if (!returned || excursion < 0.024) {
      return;
    }

    this.oscArmed = false;
    this.oscValleyY = shoulder.y;
    this.oscPeakY = shoulder.y;

    if (this.repMachine.tryCount(timestampMs)) {
      this.resetRepCyclePeaks();
    }
  }

  private updateLegacyCalibration(frame: PoseFrame): void {
    this.calibrationAttempts += 1;

    const sample = sampleCalibration(frame, this.options.minLandmarkScore);
    if (!sample) {
      return;
    }

    this.calibration = mergeCalibration(this.calibration, sample);
    this.calibrationFramesSeen += 1;
  }

  private legacyCalibrating(): boolean {
    if (this.options.calibrationFrames === 0) {
      return false;
    }

    if (this.calibrationFramesSeen >= this.options.calibrationFrames) {
      return false;
    }

    return this.calibrationAttempts < this.options.calibrationMaxAttempts;
  }

  private countingEnabled(): boolean {
    return !this.legacyCalibrating();
  }

  private isLearningRange(): boolean {
    if (this.repMachine.snapshot().count > 0) {
      return false;
    }

    if (this.legacyCalibrating()) {
      return true;
    }

    return this.repMachine.depthRange() < MIN_FUSED_MOVEMENT_RANGE;
  }

  private calibrationProgress(movementRange: number): number {
    if (this.legacyCalibrating()) {
      if (this.options.calibrationFrames === 0) {
        return 1;
      }

      const sampleProgress =
        this.calibrationFramesSeen / this.options.calibrationFrames;
      const attemptProgress =
        this.calibrationAttempts / this.options.calibrationMaxAttempts;

      return Math.min(1, Math.max(sampleProgress, attemptProgress));
    }

    return Math.min(1, movementRange / MIN_FUSED_MOVEMENT_RANGE);
  }

  private trackingIsStable(): boolean {
    if (this.visibility.length < this.options.visibilityWarmupFrames) {
      return this.bodyInFrame;
    }

    return this.visibilityRatio() >= this.options.minVisibilityRatio;
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
