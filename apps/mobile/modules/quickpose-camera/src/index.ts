import { requireNativeViewManager, requireOptionalNativeModule } from 'expo-modules-core';
import type { ComponentType } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

/** One joint from the native landmark bridge (normalized 0–1 image space). */
export type QuickPoseLandmarkPoint = {
  x: number;
  y: number;
  /** Visibility / confidence when the SDK provides it; JS defaults to 1. */
  score?: number;
};

export type QuickPoseLandmarks = Partial<
  Record<
    | 'nose'
    | 'leftShoulder'
    | 'rightShoulder'
    | 'leftElbow'
    | 'rightElbow'
    | 'leftWrist'
    | 'rightWrist'
    | 'leftHip'
    | 'rightHip'
    | 'leftKnee'
    | 'rightKnee'
    | 'leftAnkle'
    | 'rightAnkle',
    QuickPoseLandmarkPoint
  >
>;

export type QuickPoseCameraUpdateEvent = {
  nativeEvent: {
    results: Record<string, number>;
    feedbacks: Record<string, string>;
    /** Compact body joints for stance gates; omitted joints are absent. */
    landmarks?: QuickPoseLandmarks;
    /** True when the SDK handed landmarks for this frame (may still be empty). */
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
  /** Average video bitrate in bits per second. */
  bitRate: number;
  /** Target frames per second for the written clip. */
  frameRate: number;
  /** Encoded frame width in pixels (even). */
  width: number;
  /** Encoded frame height in pixels (even). */
  height: number;
};

export type QuickPoseCameraViewProps = {
  sdkKey: string;
  features: string[];
  featureStyles?: Record<string, Record<string, unknown>>;
  useFrontCamera?: boolean;
  style?: StyleProp<ViewStyle>;
  onUpdate?: (event: QuickPoseCameraUpdateEvent) => void;
  /** When set, the native view records a muted proof clip (HEVC on iOS, H.264 on Android). */
  proofRecording?: ProofRecordingConfig | null;
  /** Live rep count burned into the proof overlay. */
  proofCount?: number;
  /** Increment to finish the in-flight recording (emits onProofRecorded). */
  finishProofToken?: number;
  /** Wall-clock ms of the last rep plus a short tail. Trim standing-up off the end. */
  finishProofEndAtMs?: number;
  onProofRecorded?: (event: ProofRecordedEvent) => void;
  onProofRecordingError?: (event: ProofRecordingErrorEvent) => void;
};

export const QuickPoseCameraView: ComponentType<QuickPoseCameraViewProps> =
  requireNativeViewManager('QuickPoseCamera');

const nativeModule = requireOptionalNativeModule<{ proofClipsDirectoryUri?: string }>(
  'QuickPoseCamera',
);

/** This install's folder for finished proof clips, or null where the native side does not record. */
export function proofClipsDirectoryUri(): string | null {
  return nativeModule?.proofClipsDirectoryUri || null;
}

/**
 * True when this binary ships the real QuickPose camera (exports
 * `proofClipsDirectoryUri`). Stale Android stubs expose the view manager but
 * no constants — mounting them with current JS props can crash the app.
 */
export function isPoseCameraAvailable(): boolean {
  return proofClipsDirectoryUri() !== null;
}

/** Whether this platform's camera view writes proof clips (iOS and Android; not web). */
export function canRecordProofClips(): boolean {
  return isPoseCameraAvailable();
}
