import type { MatchMetric, ProofClipAudience } from '@product/client';
import type { ProofRecordingConfig } from 'quickpose-camera';
import type { PoseSessionProps } from './pose-session';

/** Lifecycle of an optional proof clip for one pose set. */
export type ProofClipStatus =
  | 'off'
  | 'armed'
  | 'reserving'
  | 'recording'
  | 'finalizing'
  | 'saved'
  | 'failed'
  | 'discarded';

export type ProofClipOutcome = 'saved' | 'failed' | 'discarded' | 'off';

export type ProofRecordedEvent = {
  fileUri: string;
  sha256: string;
  byteSize: number;
  durationSeconds: number;
  posterUri?: string;
};

export type ProofClipContext = {
  props: PoseSessionProps;
  metric: MatchMetric;
  userChallengeId: string | null;
  matchId: string | null;
  /** True once the metric and challenge or match are known, so a code can be reserved ahead of the set. */
  isReady: boolean;
};

export type ProofClipRecording = {
  status: ProofClipStatus;
  recordProof: boolean;
  showProofExplainer: boolean;
  proofRecording: ProofRecordingConfig | null;
  proofClipId: string | null;
  finishProofToken: number;
  finishProofEndAtMs: number;
  proofFailed: boolean;
  audience: ProofClipAudience;
  showAudienceSheet: boolean;
  openAudienceSheet: () => void;
  closeAudienceSheet: () => void;
  setAudience: (audience: ProofClipAudience) => void;
  confirmAudienceSheet: () => void;
  toggleRecordProof: (enabled: boolean) => void;
  /** Starts the clip without blocking counting; recording begins once the code is in hand. */
  armForCounting: () => void;
  requestFinish: (options?: { lastRepAtMs?: number | null }) => void;
  waitUntilSettled: () => Promise<ProofClipOutcome>;
  handleProofRecorded: (event: ProofRecordedEvent) => Promise<void>;
  handleProofRecordingError: (message: string) => void;
  discardReservation: () => Promise<void>;
  clipIdRef: { current: string | null };
};
