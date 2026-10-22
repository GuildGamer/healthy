/** The parts of a stored session a later save of the same session may change. */
export type MeasuredFields = {
  count: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  endedAt: Date | null;
};
