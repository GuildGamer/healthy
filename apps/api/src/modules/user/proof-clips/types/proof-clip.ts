import type { DeviceMetric, ProofClipStatus } from '@product/db';

export type ProofClipRow = {
  id: string;
  userId: string;
  code: string;
  metric: DeviceMetric;
  count: number;
  durationSeconds: number | null;
  userChallengeId: string | null;
  matchId: string | null;
  matchAttemptId: string | null;
  status: ProofClipStatus;
  sha256: string | null;
  byteSize: number | null;
  videoKey: string | null;
  posterKey: string | null;
  sharedAt: Date | null;
  lastViewedAt: Date | null;
  expiresAt: Date | null;
  reservedAt: Date;
  recordedAt: Date | null;
  attested: boolean;
  skeletonTrack: string | null;
};

export type VerifyRateBucket = {
  timestamps: number[];
};
