import { colors, fontSize, spacing } from '@product/brand';
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
import type { TfliteModel } from 'react-native-fast-tflite';
import { Worklets } from 'react-native-worklets-core';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import type { PoseFrame } from '@/lib/pose/landmarks';
import {
  MOVENET_RGB_BYTE_LENGTH,
  packMoveNetInputForBridge,
} from '@/lib/pose/copy-rgb-tensor';
import {
  mapMoveNetOutput,
  MOVENET_INPUT_SIZE,
  MOVENET_MODEL,
} from '@/lib/pose/pose-model';
import { isFrameOrientation } from '@/lib/pose/frame-orientation';
import { userFacingPoseError } from '@/lib/pose/user-facing-pose-error';

type PoseVisionCameraProps = {
  /** When false the frame processor still runs but skips pose callbacks. */
  processing: boolean;
  /** Resets pose timestamps when counting begins. */
  sessionKey?: number;
  onPoseFrame: (frame: PoseFrame) => void;
  onModelStateChange?: (ready: boolean, detail: string) => void;
};

function runMoveNetOnJs(
  model: TfliteModel,
  packedInput: number[],
): number[] | null {
  if (packedInput.length !== MOVENET_RGB_BYTE_LENGTH) {
    throw new Error(
      `MoveNet input must be ${MOVENET_RGB_BYTE_LENGTH} bytes, got ${packedInput.length}`,
    );
  }

  const input = new Uint8Array(MOVENET_RGB_BYTE_LENGTH);
  for (let index = 0; index < packedInput.length; index += 1) {
    input[index] = packedInput[index]!;
  }

  const outputs = model.runSync([input.buffer]);
  const first = outputs[0];
  if (!first) {
    return null;
  }

  return Array.from(new Float32Array(first));
}

/**
 * Live front camera + on-device MoveNet Thunder. Landmarks never leave the device;
 * only parsed PoseFrames are handed to the JS counter.
 *
 * MoveNet runs on the JS thread — Vision Camera worklets cannot access Nitro
 * HybridObjects (TfliteModel) even when boxed.
 */
export function PoseVisionCamera({
  processing,
  sessionKey = 0,
  onPoseFrame,
  onModelStateChange,
}: PoseVisionCameraProps) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');
  const plugin = useTensorflowModel(MOVENET_MODEL, []);
  const loadedModel = plugin.state === 'loaded' ? plugin.model : undefined;
  const { resize } = useResizePlugin();
  const processingRef = useRef(processing);
  const modelRef = useRef(loadedModel);
  const sessionOriginMs = useRef(Date.now());
  const lastTrackingErrorAtMs = useRef(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  useEffect(() => {
    modelRef.current = loadedModel;
  }, [loadedModel]);

  useEffect(() => {
    processingRef.current = processing;
  }, [processing]);

  useEffect(() => {
    sessionOriginMs.current = Date.now();
  }, [sessionKey]);

  useEffect(() => {
    if (!hasPermission) {
      void requestPermission();
    }
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    if (plugin.state === 'loaded') {
      onModelStateChange?.(true, 'MoveNet ready');
      return;
    }

    if (plugin.state === 'error') {
      onModelStateChange?.(false, 'Pose model failed to load');
      return;
    }

    onModelStateChange?.(false, 'Loading pose model…');
  }, [plugin.state, onModelStateChange]);

  const onKeypoints = useCallback(
    (
      keypoints: number[],
      orientation: string,
      bufferWidth: number,
      bufferHeight: number,
    ) => {
      if (!processingRef.current) {
        return;
      }

      const timestampMs = Date.now() - sessionOriginMs.current;
      const frameOrientation = isFrameOrientation(orientation)
        ? orientation
        : 'portrait';
      onPoseFrame(
        mapMoveNetOutput(keypoints, timestampMs, {
          orientation: frameOrientation,
          preRotated: true,
          bufferWidth,
          bufferHeight,
        }),
      );
    },
    [onPoseFrame],
  );

  const clearTrackingError = useCallback(() => {
    setTrackingError(null);
  }, []);

  const reportPoseError = useCallback((message: string) => {
    const now = Date.now();
    if (now - lastTrackingErrorAtMs.current < 2_000) {
      return;
    }

    lastTrackingErrorAtMs.current = now;
    setTrackingError(userFacingPoseError(message));
  }, []);

  const onKeypointsRef = useRef(onKeypoints);
  onKeypointsRef.current = onKeypoints;

  const reportPoseErrorRef = useRef(reportPoseError);
  reportPoseErrorRef.current = reportPoseError;

  const clearTrackingErrorRef = useRef(clearTrackingError);
  clearTrackingErrorRef.current = clearTrackingError;

  const runInferenceOnJs = useMemo(
    () =>
      Worklets.createRunOnJS(
        (
          packedInput: number[],
          orientation: string,
          bufferWidth: number,
          bufferHeight: number,
        ) => {
          const model = modelRef.current;
          if (model == null) {
            return;
          }

          try {
            const keypoints = runMoveNetOnJs(model, packedInput);
            if (keypoints == null) {
              return;
            }

            clearTrackingErrorRef.current();
            onKeypointsRef.current(
              keypoints,
              orientation,
              bufferWidth,
              bufferHeight,
            );
          } catch (error) {
            const message =
              error instanceof Error && error.message.length > 0
                ? error.message
                : 'Pose tracking failed';
            reportPoseErrorRef.current(message);
          }
        },
      ),
    [],
  );

  const runOnJsError = useMemo(
    () =>
      Worklets.createRunOnJS((message: string) => {
        reportPoseErrorRef.current(message);
      }),
    [],
  );

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      // Thunder is heavier than Lightning; 8fps keeps JS-thread inference stable.
      runAtTargetFps(8, () => {
        'worklet';
        try {
          // Inline — worklets cannot call arbitrary imported helpers.
          // Matches Skia upright counter-rotation / resizeRotationForOrientation.
          const orientation = frame.orientation;
          let rotation: '0deg' | '90deg' | '180deg' | '270deg' = '0deg';
          if (orientation === 'landscape-left') {
            rotation = '270deg';
          } else if (orientation === 'landscape-right') {
            rotation = '90deg';
          } else if (orientation === 'portrait-upside-down') {
            rotation = '180deg';
          }

          const resized = resize(frame, {
            scale: {
              width: MOVENET_INPUT_SIZE,
              height: MOVENET_INPUT_SIZE,
            },
            // Upright before MoveNet — model quality collapses on sideways people.
            rotation,
            pixelFormat: 'rgb',
            dataType: 'uint8',
          });

          runInferenceOnJs(
            packMoveNetInputForBridge(resized),
            orientation,
            frame.width,
            frame.height,
          );
        } catch (error) {
          const message =
            error instanceof Error && error.message.length > 0
              ? error.message
              : 'Pose tracking failed';
          runOnJsError(message);
        }
      });
    },
    [resize, runInferenceOnJs, runOnJsError],
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

  if (plugin.state === 'error') {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>Pose model failed to load.</Text>
      </View>
    );
  }

  if (loadedModel == null) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>Loading pose model…</Text>
      </View>
    );
  }

  const overlayMessage = cameraError ?? trackingError;

  return (
    <View style={styles.wrap} testID="pose-vision-camera">
      <Camera
        device={device}
        frameProcessor={frameProcessor}
        isActive
        isMirrored
        onError={(error) =>
          setCameraError(userFacingPoseError(error.message))
        }
        pixelFormat="yuv"
        // Widest FOV available (ultra-wide front when the device has one).
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
        zoom={device.minZoom}
      />
      {overlayMessage ? (
        <View pointerEvents="none" style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{overlayMessage}</Text>
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
  errorBanner: {
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
  },
  errorBannerText: {
    color: colors.danger,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
});
