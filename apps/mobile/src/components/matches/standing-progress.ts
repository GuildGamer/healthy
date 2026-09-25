export const STANDING_NO_SCORE = 'Nothing yet';

export type StandingProgress = {
  /** Share of the leader's score, 0 to 1, for the row's bar. */
  fraction: number;
  /**
   * The one thing the bar cannot say on its own. Always the distance from the
   * lead, so the column reads consistently down the board. Null for whoever is
   * on top, where the rank and the full bar already say it.
   */
  note: string | null;
};

export function standingProgress(input: {
  score: number;
  leadScore: number;
}): StandingProgress {
  const { score, leadScore } = input;

  if (score <= 0) {
    return { fraction: 0, note: STANDING_NO_SCORE };
  }

  if (leadScore <= 0 || score >= leadScore) {
    return { fraction: 1, note: null };
  }

  const gap = leadScore - score;
  return {
    fraction: score / leadScore,
    note: gap === 1 ? '1 behind' : `${gap} behind`,
  };
}
