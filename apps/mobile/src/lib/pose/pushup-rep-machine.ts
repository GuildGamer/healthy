export type PushupRepPhase = 'up' | 'down';

export type PushupRepMachineSnapshot = {
  count: number;
  phase: PushupRepPhase;
  calibrated: boolean;
  typicalSwing: number | null;
  cycleAmplitude: number;
  normalizedDepth: number;
};

export type PushupRepMachineOptions = {
  minRepIntervalMs?: number;
  /**
   * After the first two reps, a cycle must reach this fraction of the
   * learned swing to arm. Learning reps only need `minSwing`.
   */
  enterFraction?: number;
  /** Count after rising this far from the bottom back toward the top. */
  returnFraction?: number;
  /** How many reps set the personal scale before tightening the gate. */
  learningReps?: number;
};

const DEFAULTS = {
  minRepIntervalMs: 280,
  enterFraction: 0.7,
  returnFraction: 0.45,
  learningReps: 2,
} as const;

/** Ignore jitter smaller than this in the raw signal. */
const DIRECTION_DEADZONE = 0.0035;

const MIN_SWING_FLOOR = 0.016;
const MIN_SWING_CEILING = 0.055;
const MIN_SWING_BODY_FRACTION = 0.08;

/** Scale the minimum real-press travel to how large the body is in frame. */
export function minSwingForBody(bodyExtent: number): number {
  return Math.min(
    MIN_SWING_CEILING,
    Math.max(MIN_SWING_FLOOR, bodyExtent * MIN_SWING_BODY_FRACTION),
  );
}

/**
 * Peak → valley → peak counter that learns range of motion from the first
 * one or two complete cycles. Higher `signal` means deeper (e.g. shoulder Y).
 */
export class PushupRepMachine {
  private count = 0;
  private phase: PushupRepPhase = 'up';
  private armed = false;
  private lastCountMs = 0;
  private lastSignal = 0;
  private cycleTop = Number.POSITIVE_INFINITY;
  private cycleBottom = Number.NEGATIVE_INFINITY;
  private typicalSwing: number | null = null;
  private readonly learningAmplitudes: number[] = [];
  private readonly options: Required<PushupRepMachineOptions>;

  constructor(options: PushupRepMachineOptions = {}) {
    this.options = { ...DEFAULTS, ...options };
  }

  reset(): void {
    this.count = 0;
    this.typicalSwing = null;
    this.learningAmplitudes.length = 0;
    this.resetTracking();
  }

  resetTracking(): void {
    this.phase = 'up';
    this.armed = false;
    this.lastSignal = 0;
    this.cycleTop = Number.POSITIVE_INFINITY;
    this.cycleBottom = Number.NEGATIVE_INFINITY;
  }

  snapshot(): PushupRepMachineSnapshot {
    const amplitude = this.cycleAmplitude();
    return {
      count: this.count,
      phase: this.phase,
      calibrated: this.typicalSwing != null,
      typicalSwing: this.typicalSwing,
      cycleAmplitude: amplitude,
      normalizedDepth: this.normalizedDepth(),
    };
  }

  advance(
    timestampMs: number,
    signal: number,
    minSwing: number,
  ): PushupRepMachineSnapshot {
    this.expandCycle(signal);
    const descending = signal > this.lastSignal + DIRECTION_DEADZONE;
    const ascending = signal < this.lastSignal - DIRECTION_DEADZONE;
    this.lastSignal = signal;

    if (this.phase === 'up' && descending) {
      this.tryArm(minSwing);
    }

    if (this.phase === 'down' && this.armed && ascending) {
      this.tryComplete(timestampMs, signal, minSwing);
    }

    return this.snapshot();
  }

  private tryArm(minSwing: number): void {
    if (this.cycleAmplitude() < this.enterNeed(minSwing)) {
      return;
    }

    this.phase = 'down';
    this.armed = true;
  }

  private tryComplete(
    timestampMs: number,
    signal: number,
    minSwing: number,
  ): void {
    const amplitude = this.cycleAmplitude();
    const enterNeed = this.enterNeed(minSwing);
    if (amplitude < enterNeed) {
      return;
    }

    const ascent = this.cycleBottom - signal;
    const neededAscent = Math.max(
      minSwing * 0.5,
      amplitude * (1 - this.options.returnFraction),
    );
    if (ascent < neededAscent) {
      return;
    }

    this.phase = 'up';
    this.armed = false;

    if (timestampMs - this.lastCountMs >= this.options.minRepIntervalMs) {
      this.count += 1;
      this.lastCountMs = timestampMs;
      this.rememberSwing(amplitude);
    }

    this.startNewCycle(signal);
  }

  private rememberSwing(amplitude: number): void {
    if (this.learningAmplitudes.length < this.options.learningReps) {
      this.learningAmplitudes.push(amplitude);
      this.typicalSwing = Math.min(...this.learningAmplitudes);
      return;
    }

    if (this.typicalSwing == null) {
      this.typicalSwing = amplitude;
      return;
    }

    if (amplitude < this.typicalSwing) {
      this.typicalSwing = 0.5 * this.typicalSwing + 0.5 * amplitude;
      return;
    }

    this.typicalSwing = 0.9 * this.typicalSwing + 0.1 * amplitude;
  }

  private enterNeed(minSwing: number): number {
    if (
      this.typicalSwing == null ||
      this.learningAmplitudes.length < this.options.learningReps
    ) {
      return minSwing;
    }

    return Math.max(minSwing, this.typicalSwing * this.options.enterFraction);
  }

  private expandCycle(signal: number): void {
    this.cycleTop = Math.min(this.cycleTop, signal);
    this.cycleBottom = Math.max(this.cycleBottom, signal);
  }

  private startNewCycle(signal: number): void {
    this.cycleTop = signal;
    this.cycleBottom = signal;
  }

  private cycleAmplitude(): number {
    if (
      !Number.isFinite(this.cycleTop) ||
      !Number.isFinite(this.cycleBottom)
    ) {
      return 0;
    }

    return Math.max(0, this.cycleBottom - this.cycleTop);
  }

  private normalizedDepth(): number {
    const swing = this.typicalSwing ?? this.cycleAmplitude();
    if (swing <= 0 || !Number.isFinite(this.cycleTop)) {
      return 0;
    }

    return clamp01((this.lastSignal - this.cycleTop) / swing);
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
