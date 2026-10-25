/**
 * Accumulates whole seconds while the person is in the hold position
 * (QuickPose measure above the enter threshold) and well framed.
 */
export type QuickPoseHoldState = {
  seconds: number;
  isHolding: boolean;
  /** Fractional seconds banked since the last whole second. */
  fraction: number;
};

export const HOLD_ENTER_THRESHOLD = 0.55;
export const HOLD_EXIT_THRESHOLD = 0.35;

export function createHoldTimer(): QuickPoseHoldState {
  return { seconds: 0, isHolding: false, fraction: 0 };
}

/**
 * Advance the hold timer by `deltaSeconds` of wall time when the measure is
 * high enough and the body is in frame. Hysteresis keeps flicker from chopping
 * the clock.
 */
export function tickHoldTimer(
  state: QuickPoseHoldState,
  input: {
    measure: number | null;
    bodyInFrame: boolean;
    formFeedback: string | null;
    deltaSeconds: number;
  },
): QuickPoseHoldState {
  if (
    input.measure == null ||
    !input.bodyInFrame ||
    input.formFeedback ||
    input.deltaSeconds <= 0
  ) {
    return { ...state, isHolding: false, fraction: 0 };
  }

  const enters = input.measure >= HOLD_ENTER_THRESHOLD;
  const stays = input.measure >= HOLD_EXIT_THRESHOLD;
  const isHolding = state.isHolding ? stays : enters;

  if (!isHolding) {
    return { ...state, isHolding: false, fraction: 0 };
  }

  const nextFraction = state.fraction + input.deltaSeconds;
  const whole = Math.floor(nextFraction);

  return {
    seconds: state.seconds + whole,
    isHolding: true,
    fraction: nextFraction - whole,
  };
}
