/**
 * How far back today's tally reads before bucketing by the user's local day.
 * Two days covers every zone offset without date arithmetic of its own.
 */
export const PRACTICE_TALLY_LOOKBACK_MS = 48 * 60 * 60 * 1000;
