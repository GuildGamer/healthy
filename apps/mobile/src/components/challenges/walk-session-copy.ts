export type WalkPhase = 'idle' | 'recording' | 'review';

export const WALK_IDLE_EYEBROW = 'Ready';
export const WALK_IDLE_META = 'Start a walk and your route draws on the map.';
export const WALK_RECORDING_EYEBROW = 'Recording';
export const WALK_PAUSED_EYEBROW = 'Paused';
export const WALK_PAUSED_META = 'Paused while you stand still. Walk on and the clock picks up.';
export const WALK_GOAL_REACHED_META = 'Goal reached. Stop whenever you like.';
export const WALK_COMPLETE_EYEBROW = 'Walk complete';
export const WALK_COMPLETE_META = 'Nice one. Log it below.';
export const WALK_SHORT_EYEBROW = 'Short of the goal';

export const WALK_LOCATION_DENIED =
  'Location is needed to record a walk on this phone. You can still confirm it by hand.';

export type WalkStatus = {
  /** Small label above the large readout. */
  eyebrow: string;
  /** Line under the progress bar telling the walker what happens next. */
  meta: string;
};

/**
 * Phase wording for the card floating over the map. `shortfall` is whatever is
 * still owed toward the goal, or null once the walk would count.
 */
export function walkStatus({
  phase,
  shortfall,
  autoPaused,
}: {
  phase: WalkPhase;
  shortfall: string | null;
  autoPaused: boolean;
}): WalkStatus {
  if (phase === 'idle') {
    return { eyebrow: WALK_IDLE_EYEBROW, meta: WALK_IDLE_META };
  }

  if (phase === 'recording') {
    if (autoPaused) {
      return { eyebrow: WALK_PAUSED_EYEBROW, meta: WALK_PAUSED_META };
    }

    return {
      eyebrow: WALK_RECORDING_EYEBROW,
      meta: shortfall ?? WALK_GOAL_REACHED_META,
    };
  }

  if (shortfall) {
    return { eyebrow: WALK_SHORT_EYEBROW, meta: shortfall };
  }

  return { eyebrow: WALK_COMPLETE_EYEBROW, meta: WALK_COMPLETE_META };
}
