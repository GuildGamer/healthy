import { requireNativeViewManager } from 'expo-modules-core';
import type { ComponentType } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type QuickPoseCameraUpdateEvent = {
  nativeEvent: {
    results: Record<string, number>;
    feedbacks: Record<string, string>;
    /** True once QuickPose has delivered landmarks in this session (phase 5). */
    landmarksAvailable?: boolean;
  };
};

export type ProofRecordedEvent = {
  nativeEvent: {
    fileUri: string;
    sha256: string;
    byteSize: number;
    durationSeconds: number;
    posterUri?: string;
  };
};

export type ProofRecordingErrorEvent = {
  nativeEvent: {
    message: string;
  };
};

export type ProofRecordingConfig = {
  code: string;
  label: string;
  /** Frames past this are dropped so the clip stays within what the API accepts. */
  maxDurationSeconds: number;
};

export type QuickPoseCameraViewProps = {
  sdkKey: string;
  features: string[];
  featureStyles?: Record<string, Record<string, unknown>>;
  useFrontCamera?: boolean;
  style?: StyleProp<ViewStyle>;
  onUpdate?: (event: QuickPoseCameraUpdateEvent) => void;
  /** When set, the native view records a muted HEVC proof clip. */
  proofRecording?: ProofRecordingConfig | null;
  /** Live rep count burned into the proof overlay. */
  proofCount?: number;
  /** Increment to finish the in-flight recording (emits onProofRecorded). */
  finishProofToken?: number;
  onProofRecorded?: (event: ProofRecordedEvent) => void;
  onProofRecordingError?: (event: ProofRecordingErrorEvent) => void;
};

export const QuickPoseCameraView: ComponentType<QuickPoseCameraViewProps> =
  requireNativeViewManager('QuickPoseCamera');
