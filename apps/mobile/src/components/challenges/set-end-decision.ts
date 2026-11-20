export type SetEndDecision =
  | { kind: 'none' }
  | { kind: 'countdown'; seconds: number }
  | { kind: 'finish' };

const IDLE_OUT_OF_FRAME_MS = 4_000;
const IDLE_IN_FRAME_MS = 15_000;
const COUNTDOWN_SECONDS = 3;

/**
 * When a counted set should auto-finish. Plank is excluded by the caller —
 * its hold timer already ends the set.
 */
export function setEndDecision(input: {
  count: number;
  lastRepAtMs: number | null;
  nowMs: number;
  bodyInFrame: boolean;
}): SetEndDecision {
  if (input.count < 1 || input.lastRepAtMs == null) {
    return { kind: 'none' };
  }

  const idleMs = input.nowMs - input.lastRepAtMs;
  const thresholdMs = input.bodyInFrame ? IDLE_IN_FRAME_MS : IDLE_OUT_OF_FRAME_MS;
  if (idleMs < thresholdMs) {
    return { kind: 'none' };
  }

  const overdueMs = idleMs - thresholdMs;
  const secondsLeft = COUNTDOWN_SECONDS - Math.floor(overdueMs / 1_000);
  if (secondsLeft <= 0) {
    return { kind: 'finish' };
  }

  return { kind: 'countdown', seconds: secondsLeft };
}
