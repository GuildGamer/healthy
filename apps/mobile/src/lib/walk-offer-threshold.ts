/** Share of the daily walk goal that must be walked before we ask. */
export const WALK_OFFER_GOAL_FRACTION = 0.25;

/** Moving seconds that unlock the Yes / Not now prompt for a duration goal. */
export function walkOfferThresholdSeconds(targetDurationMinutes: number): number {
  if (targetDurationMinutes <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.ceil(targetDurationMinutes * 60 * WALK_OFFER_GOAL_FRACTION);
}

/** True when the current bout is long enough to offer counting. */
export function walkOfferShouldPrompt(
  movingSeconds: number,
  targetDurationMinutes: number,
): boolean {
  return movingSeconds >= walkOfferThresholdSeconds(targetDurationMinutes);
}
