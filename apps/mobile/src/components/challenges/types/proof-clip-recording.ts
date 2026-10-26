import type { MatchMetric } from '@product/client';
import type { ProofRecordingConfig } from 'quickpose-camera';
import type { PoseSessionProps } from './pose-session';

/** Lifecycle of an optional proof clip for one pose set. */
export type ProofClipStatus =
  | 'off'
  | 'armed'
  | 'recording'
  | 'finalizing'
  | 'saved'
  | 'failed'
  | 'discarded';

export type ProofClipOutcome = 'saved' | 'failed' | 'discarded' | 'off';

/** Group sets post to the board; solo sets are shared. */
export type ProofClipVisibility = 'group' | 'shared';

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
};

export type ProofClipRecording = {
  status: ProofClipStatus;
  recordProof: boolean;
  showProofExplainer: boolean;
  proofRecording: ProofRecordingConfig | null;
  proofClipId: string | null;
  finishProofToken: number;
  proofFailed: boolean;
  toggleRecordProof: (enabled: boolean) => void;
  armForCounting: () => Promise<void>;
  requestFinish: () => void;
  waitUntilSettled: () => Promise<ProofClipOutcome>;
  handleProofRecorded: (event: ProofRecordedEvent) => Promise<void>;
  handleProofRecordingError: (message: string) => void;
  discardReservation: () => Promise<void>;
  clipIdRef: { current: string | null };
};
