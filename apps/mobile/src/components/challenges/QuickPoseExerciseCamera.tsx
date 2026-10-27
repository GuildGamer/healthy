import type { MatchMetric } from '@product/contract/match-board';
import {
  QuickPoseCameraView,
  type ProofRecordedEvent,
  type ProofRecordingConfig,
  type ProofRecordingErrorEvent,
} from 'quickpose-camera';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
  QUICKPOSE_INSIDE_FEATURE,
  QUICKPOSE_OVERLAY_FEATURE,
  quickPoseFeaturesFor,
  type QuickPoseExerciseUpdate,
} from '@/lib/pose/quickpose-exercise';
import { useTheme } from '@/theme';

type QuickPoseExerciseCameraProps = {
  sdkKey: string;
  metric: MatchMetric;
  onUpdate: (update: QuickPoseExerciseUpdate) => void;
  proofRecording?: ProofRecordingConfig | null;
  proofCount?: number;
  finishProofToken?: number;
  finishProofEndAtMs?: number;
  onProofRecorded?: (event: ProofRecordedEvent['nativeEvent']) => void;
  onProofRecordingError?: (message: string) => void;
};

/**
 * Mounts the QuickPose native camera for a pose metric. Do not import this
 * module except from a pose session — QuickPose bills monthly active devices
 * when the native SDK runs.
 */
export function QuickPoseExerciseCamera({
  sdkKey,
  metric,
  onUpdate,
  proofRecording = null,
  proofCount = 0,
  finishProofToken = 0,
  finishProofEndAtMs = 0,
  onProofRecorded,
  onProofRecordingError,
}: QuickPoseExerciseCameraProps) {
  const { colors } = useTheme();
  const features = useMemo(() => [...quickPoseFeaturesFor(metric)], [metric]);
  const featureStyles = useMemo(
    () => ({
      [QUICKPOSE_OVERLAY_FEATURE]: {
        color: colors.accent,
        relativeLineWidth: 1.2,
      },
      [QUICKPOSE_INSIDE_FEATURE]: {
        edgeInsets: { top: 0.1, left: 0.1, bottom: 0.1, right: 0.1 },
        relativeLineWidth: 2,
        cornerRadius: 16,
        color: colors.danger,
        conditionalColors: [{ min: 0.95, color: colors.accent }],
      },
    }),
    [colors],
  );

  return (
    <QuickPoseCameraView
      features={features}
      featureStyles={featureStyles}
      onProofRecorded={(event: ProofRecordedEvent) => {
        onProofRecorded?.(event.nativeEvent);
      }}
      onProofRecordingError={(event: ProofRecordingErrorEvent) => {
        onProofRecordingError?.(event.nativeEvent.message);
      }}
      onUpdate={(event) => {
        onUpdate({
          results: event.nativeEvent.results,
          feedbacks: event.nativeEvent.feedbacks,
        });
      }}
      finishProofEndAtMs={finishProofEndAtMs}
      finishProofToken={finishProofToken}
      proofCount={proofCount}
      proofRecording={proofRecording}
      sdkKey={sdkKey}
      style={styles.camera}
      useFrontCamera
    />
  );
}

const styles = StyleSheet.create({
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
});
