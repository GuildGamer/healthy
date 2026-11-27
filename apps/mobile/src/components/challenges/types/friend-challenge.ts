import type { CreateMatchInput, MatchMetric } from '@product/client';

/** The contest a "Challenge a friend" tap creates, and how its invite reads. */
export type FriendChallengeSpec = {
  match: Pick<CreateMatchInput, 'metric' | 'scoringMode' | 'window' | 'dailyScope' | 'seedCount'>;
  /** Names the score in the invite, as in "I did 22 push-ups". Null leaves the score out. */
  metricLabel: string | null;
};

/** What was just done, in the terms a friend challenge is built from. */
export type FriendChallengeSource =
  | { kind: 'reps'; count: number; metric: MatchMetric }
  | { kind: 'walk' }
  | { kind: 'day' };

/** The parts of an experiment assignment that decide which arm someone is in. */
export type ExperimentArm = {
  variantKey: string;
  configuration: Record<string, unknown> | null;
};

/** A past finish's invite, carried beside the poster so the image stays free of it. */
export type ShareFriend = {
  source: FriendChallengeSource;
  userChallengeId: string;
  isEligible: boolean;
};
