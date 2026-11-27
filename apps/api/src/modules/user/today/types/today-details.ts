import type { ChallengeCapture, DeviceMetric } from '@product/contract';

/** A sensor-measured session, already placed on the member's local day. */
export type MeasuredSession = {
  metric: DeviceMetric;
  dayKey: string;
  durationSeconds: number | null;
  distanceMeters: number | null;
  count: number | null;
};

/** One occurrence on Today, reduced to what its details are derived from. */
export type DueOccurrence = {
  id: string;
  challengeId: string;
  periodKey: string;
  completedAt: Date | null;
  capture: ChallengeCapture;
};

export type TodayDetailsInput = {
  occurrences: readonly DueOccurrence[];
  /** Latest local day each challenge was finished, before the occurrences on Today. */
  lastCompletedDayKeyByChallenge: ReadonlyMap<string, string>;
  /** Local days each challenge was finished, from the earliest period on Today. */
  completedDayKeysByChallenge: ReadonlyMap<string, ReadonlySet<string>>;
  sessions: readonly MeasuredSession[];
  dayKey: string;
  weekStartKey: string;
};
