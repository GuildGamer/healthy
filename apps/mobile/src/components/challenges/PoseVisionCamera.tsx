import { colors, fontSize, fontWeight, spacing } from '@product/brand';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  runAtTargetFps,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { Worklets } from 'react-native-worklets-core';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import type { PoseFrame } from '@/lib/pose/landmarks';
import {
  mapMoveNetOutput,
  MOVENET_INPUT_SIZE,
  MOVENET_MODEL,
} from '@/lib/pose/pose-model';

type PoseVisionCameraProps = {
  /** When false the frame processor still runs but skips counting callbacks. */
  counting: boolean;
  onPoseFrame: (frame: PoseFrame) => void;
  onModelStateChange?: (ready: boolean, detail: string) => void;
};

/**
 * Live front camera + on-device MoveNet. Landmarks never leave the device;
 * only parsed PoseFrames are handed to the JS counter.
 */
export function PoseVisionCamera({
  counting,
  onPoseFrame,
  onModelStateChange,
}: PoseVisionCameraProps) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');
  const { model, state: modelState } = useTensorflowModel(MOVENET_MODEL, []);
  const { resize } = useResizePlugin();
  const countingRef = useRef(counting);
  const sessionOriginMs = useRef(Date.now());
  const [nativeError, setNativeError] = useState<string | null>(null);

  useEffect(() => {
    countingRef.current = counting;
  }, [counting]);

  useEffect(() => {
    if (!hasPermission) {
      void requestPermission();
    }
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    if (modelState === 'loaded') {
      onModelStateChange?.(true, 'MoveNet ready');
      return;
    }

    if (modelState === 'error') {
      onModelStateChange?.(false, 'Pose model failed to load');
      return;
    }

    onModelStateChange?.(false, 'Loading pose model…');
  }, [modelState, onModelStateChange]);

  const onKeypoints = useCallback(
    (keypoints: number[]) => {
      if (!countingRef.current) {
        return;
      }

      const timestampMs = Date.now() - sessionOriginMs.current;
      onPoseFrame(mapMoveNetOutput(keypoints, timestampMs));
    },
    [onPoseFrame],
  );

  const runOnJs = useMemo(
    () => Worklets.createRunOnJS(onKeypoints),
    [onKeypoints],
  );

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      if (model == null) {
        return;
      }

      runAtTargetFps(12, () => {
        'worklet';
        const resized = resize(frame, {
          scale: {
            width: MOVENET_INPUT_SIZE,
            height: MOVENET_INPUT_SIZE,
          },
          pixelFormat: 'rgb',
          dataType: 'uint8',
        });

        const outputs = model.runSync([
          resized.buffer.slice(
            resized.byteOffset,
            resized.byteOffset + resized.byteLength,
          ),
        ]);
        const first = outputs[0];
        if (!first) {
          return;
        }

        const out = new Float32Array(first);
        const flat: number[] = [];
        for (let index = 0; index < out.length; index += 1) {
          flat.push(out[index]!);
        }
        runOnJs(flat);
      });
    },
    [model, resize, runOnJs],
  );

  if (!hasPermission) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>
          Camera access is needed to count push-ups.
        </Text>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>No front camera on this device.</Text>
      </View>
    );
  }

  if (nativeError) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>{nativeError}</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap} testID="pose-vision-camera">
      <Camera
        device={device}
        frameProcessor={frameProcessor}
        isActive
        onError={(error) => setNativeError(error.message)}
        pixelFormat="yuv"
        style={StyleSheet.absoluteFill}
      />
      {modelState !== 'loaded' ? (
        <View style={styles.banner} pointerEvents="none">
          <Text style={styles.bannerText}>Loading pose model…</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  fallbackText: {
    color: colors.muted,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  banner: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    top: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: 8,
  },
  bannerText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
});
