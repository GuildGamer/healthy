export type PushupRepPhase = 'init' | 'up' | 'down';

export type PushupRepMachineSnapshot = {
  count: number;
  phase: PushupRepPhase;
  repArmed: boolean;
};

export type PushupRepMachineOptions = {
  /**
   * Top of the valid “up” band. After a deep enough bottom, returning to this
   * depth (or lower) counts — full lockout is not required.
   */
  upDepth?: number;
  /** Bottom of the valid “down” band. Must reach this to arm a rep. */
  downDepth?: number;
  minRepIntervalMs?: number;
  minDepthRange?: number;
};

const DEFAULTS = {
  // Valid up: depth ≤ 0.42 (mostly extended; 8fps smoother lag can sit ~0.4).
  upDepth: 0.42,
  // Valid down: depth ≥ 0.5 (clear bottom — rejects shallow half-reps).
  downDepth: 0.5,
  minRepIntervalMs: 320,
  minDepthRange: 0.05,
} as const;

/**
 * Band-based continuous-rep FSM:
 * - Arm only after entering the down band while descending (and allowed)
 * - Count when returning into the up band — quality must not veto a finished cycle
 * - Shallow dips that never hit the down band never count
 */
export class PushupRepMachine {
  private count = 0;
  private phase: PushupRepPhase = 'init';
  private repArmed = false;
  private lastCountMs = 0;
  private cyclePeakDepth = 0;
  private lastDepth = 0;
  private ascendingStreak = 0;
  private descendingStreak = 0;
  private sessionDepthMin = 1;
  private sessionDepthMax = 0;
  private readonly options: Required<PushupRepMachineOptions>;

  constructor(options: PushupRepMachineOptions = {}) {
    this.options = { ...DEFAULTS, ...options };
  }

  reset(): void {
    this.count = 0;
    this.phase = 'init';
    this.repArmed = false;
    this.lastCountMs = 0;
    this.cyclePeakDepth = 0;
    this.lastDepth = 0;
    this.ascendingStreak = 0;
    this.descendingStreak = 0;
    this.sessionDepthMin = 1;
    this.sessionDepthMax = 0;
  }

  resetTracking(): void {
    this.phase = 'init';
    this.repArmed = false;
    this.cyclePeakDepth = 0;
    this.ascendingStreak = 0;
    this.descendingStreak = 0;
  }

  snapshot(): PushupRepMachineSnapshot {
    return {
      count: this.count,
      phase: this.phase,
      repArmed: this.repArmed,
    };
  }

  depthRange(): number {
    return this.sessionDepthMax - this.sessionDepthMin;
  }

  trackDepth(depth: number): void {
    this.sessionDepthMin = Math.min(this.sessionDepthMin, depth);
    this.sessionDepthMax = Math.max(this.sessionDepthMax, depth);
  }

  advance(
    timestampMs: number,
    depth: number,
    canArm: boolean,
  ): PushupRepMachineSnapshot {
    this.trackDepth(depth);
    this.updateMotion(depth);

    const downDepth = this.options.downDepth;
    const upDepth = this.options.upDepth;

    if (this.depthRange() < this.options.minDepthRange) {
      this.lastDepth = depth;
      return this.snapshot();
    }

    if (this.phase === 'init' && depth <= upDepth) {
      this.phase = 'up';
      this.repArmed = false;
      this.cyclePeakDepth = 0;
      this.lastDepth = depth;
      return this.snapshot();
    }

    if (this.phase === 'up' || this.phase === 'init') {
      if (canArm && depth >= downDepth && this.descendingStreak >= 1) {
        this.phase = 'down';
        this.repArmed = true;
        this.cyclePeakDepth = depth;
        this.ascendingStreak = 0;
      } else if (depth <= upDepth) {
        this.phase = 'up';
        this.cyclePeakDepth = 0;
      }

      this.lastDepth = depth;
      return this.snapshot();
    }

    this.cyclePeakDepth = Math.max(this.cyclePeakDepth, depth);

    // Count once depth is back in the valid up band after a real bottom.
    const returnedToUpBand =
      this.repArmed &&
      this.cyclePeakDepth >= downDepth &&
      this.ascendingStreak >= 1 &&
      depth <= upDepth;

    if (returnedToUpBand) {
      this.phase = 'up';
      this.repArmed = false;
      this.cyclePeakDepth = 0;
      this.ascendingStreak = 0;

      if (timestampMs - this.lastCountMs >= this.options.minRepIntervalMs) {
        this.count += 1;
        this.lastCountMs = timestampMs;
      }
    }

    this.lastDepth = depth;
    return this.snapshot();
  }

  /** Count from the shoulder-oscillation path without double-booking the interval. */
  tryCount(timestampMs: number): boolean {
    if (timestampMs - this.lastCountMs < this.options.minRepIntervalMs) {
      return false;
    }

    this.count += 1;
    this.lastCountMs = timestampMs;
    this.phase = 'up';
    this.repArmed = false;
    this.cyclePeakDepth = 0;
    this.ascendingStreak = 0;
    return true;
  }

  private updateMotion(depth: number): void {
    if (depth < this.lastDepth - 0.01) {
      this.ascendingStreak += 1;
      this.descendingStreak = 0;
      return;
    }

    if (depth > this.lastDepth + 0.01) {
      this.descendingStreak += 1;
      this.ascendingStreak = 0;
    }
  }
}
