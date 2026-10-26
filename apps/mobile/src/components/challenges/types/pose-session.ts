/** The daily occurrence: scored, streak-bearing, target-bound. */
export type PoseSessionProps =
  | { mode: 'challenge'; challengeId: string }
  /** A head-to-head set, scored on the match board. */
  | { mode: 'match'; matchId: string }
  /** A free set after the daily one is done: recorded, but worth nothing. */
  | { mode: 'practice'; challengeId: string };
