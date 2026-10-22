import { QuickPoseCameraView } from 'quickpose-camera';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
  QUICKPOSE_INSIDE_FEATURE,
  QUICKPOSE_OVERLAY_FEATURE,
  QUICKPOSE_PUSHUP_FEATURES,
  type QuickPosePushupUpdate,
} from '@/lib/pose/quickpose-pushup';
import { useTheme } from '@/theme';

type QuickPosePushupCameraProps = {
  sdkKey: string;
  onUpdate: (update: QuickPosePushupUpdate) => void;
};

/**
 * Mounts the QuickPose native camera. Do not import this module except from
 * the push-up pose session — QuickPose bills monthly active devices when the
 * native SDK runs.
 */
export function QuickPosePushupCamera({ sdkKey, onUpdate }: QuickPosePushupCameraProps) {
  const { colors } = useTheme();
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
      features={[...QUICKPOSE_PUSHUP_FEATURES]}
      featureStyles={featureStyles}
      onUpdate={(event) => {
        onUpdate({
          results: event.nativeEvent.results,
          feedbacks: event.nativeEvent.feedbacks,
        });
      }}
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
