import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, fontWeight, spacing } from '@product/brand';
import {
  CameraView,
  type CameraType,
  useCameraPermissions,
} from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EvidencePhotoFrame } from './EvidencePhotoFrame';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormButton, FormErrorBanner } from '@/components/forms';
import {
  CAMERA_FAILED_MESSAGE,
  PHOTO_MISSING_MESSAGE,
  SIMULATOR_CAMERA_MESSAGE,
  EVIDENCE_CAMERA_QUALITY,
  photoFromCameraTake,
  type CapturedSelfie,
} from '@/lib/capture-selfie';
import {
  defaultFacingFor,
  setCaptureResult,
  type CameraIntent,
} from '@/lib/capture-session';
import { isPhysicalDevice } from '@/lib/is-physical-device';

const HINT: Record<CameraIntent, string> = {
  selfie: 'Face + gym floor or equipment in frame.',
  proof: 'Show the proof clearly in frame.',
};

export function CaptureCameraScreen({
  challengeId,
  intent,
}: {
  challengeId: string;
  intent: CameraIntent;
}) {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>(defaultFacingFor(intent));
  const [preview, setPreview] = useState<CapturedSelfie | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  function close() {
    router.back();
  }

  async function takePhoto() {
    if (isCapturing) {
      return;
    }

    setIsCapturing(true);
    setErrorMessage(null);

    try {
      const taken = await cameraRef.current?.takePictureAsync({
        base64: true,
        quality: EVIDENCE_CAMERA_QUALITY,
        shutterSound: false,
        exif: false,
      });

      if (!taken) {
        setErrorMessage(PHOTO_MISSING_MESSAGE);
        return;
      }

      const captured = photoFromCameraTake(taken);
      if (captured.status === 'failed') {
        setErrorMessage(captured.message);
        return;
      }

      if (captured.status !== 'captured') {
        setErrorMessage(PHOTO_MISSING_MESSAGE);
        return;
      }

      setPreview(captured.photo);
    } catch {
      setErrorMessage(CAMERA_FAILED_MESSAGE);
    } finally {
      setIsCapturing(false);
    }
  }

  function usePhoto(photo: CapturedSelfie) {
    setCaptureResult(challengeId, photo);
    router.back();
  }

  if (!isPhysicalDevice()) {
    return (
      <BlockedState message={SIMULATOR_CAMERA_MESSAGE} onClose={close} />
    );
  }

  if (!permission) {
    return <View style={styles.screen} testID="camera-permission-loading" />;
  }

  if (!permission.granted) {
    return (
      <BlockedState
        actionLabel="Allow camera"
        message={CAMERA_FAILED_MESSAGE}
        onAction={() => {
          void requestPermission();
        }}
        onClose={close}
      />
    );
  }

  if (preview) {
    return (
      <PreviewState
        errorMessage={errorMessage}
        onRetake={() => setPreview(null)}
        onUse={() => usePhoto(preview)}
        photo={preview}
      />
    );
  }

  return (
    <View style={styles.screen} testID="capture-camera-screen">
      <CameraView
        facing={facing}
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView pointerEvents="box-none" style={styles.chrome}>
        <View style={styles.topBar}>
          <IconButton
            label="Close camera"
            name="x"
            onPress={close}
            testID="camera-close"
          />
          <View style={styles.hintBlock}>
            {intent === 'selfie' ? (
              <Text style={styles.kicker}>Gym check-in</Text>
            ) : null}
            <Text style={styles.hint}>{HINT[intent]}</Text>
          </View>
          <View style={styles.topSpacer} />
        </View>
        <View pointerEvents="none" style={styles.viewfinder}>
          <View style={[styles.tick, styles.tickTopLeft]} />
          <View style={[styles.tick, styles.tickTopRight]} />
          <View style={[styles.tick, styles.tickBottomLeft]} />
          <View style={[styles.tick, styles.tickBottomRight]} />
        </View>
        {errorMessage ? <FormErrorBanner message={errorMessage} /> : null}
        <View style={styles.bottomBar}>
          <View style={styles.bottomSpacer} />
          <Pressable
            accessibilityLabel="Take photo"
            accessibilityRole="button"
            disabled={isCapturing}
            onPress={() => {
              void takePhoto();
            }}
            style={({ pressed }) => [
              styles.shutter,
              pressed || isCapturing ? styles.shutterPressed : null,
            ]}
            testID="camera-shutter"
          >
            <View style={styles.shutterInner} />
          </Pressable>
          <IconButton
            label="Flip camera"
            name="refresh-cw"
            onPress={() =>
              setFacing((current) => (current === 'front' ? 'back' : 'front'))
            }
            testID="camera-flip"
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

function PreviewState({
  errorMessage,
  onRetake,
  onUse,
  photo,
}: {
  errorMessage: string | null;
  onRetake: () => void;
  onUse: () => void;
  photo: CapturedSelfie;
}) {
  return (
    <View style={styles.screen} testID="camera-preview-screen">
      <View style={styles.previewStage}>
        <EvidencePhotoFrame
          height={photo.height}
          testID="camera-preview-image"
          uri={photo.previewUri}
          width={photo.width}
        />
      </View>
      <SafeAreaView style={styles.previewChrome}>
        {errorMessage ? <FormErrorBanner message={errorMessage} /> : null}
        <View style={styles.previewActions}>
          <FormButton
            label="Retake"
            onPress={onRetake}
            testID="camera-retake"
            variant="secondary"
          />
          <FormButton
            label="Use photo"
            onPress={onUse}
            testID="camera-use-photo"
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

function BlockedState({
  actionLabel,
  message,
  onAction,
  onClose,
}: {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
  onClose: () => void;
}) {
  return (
    <SafeAreaView style={styles.blocked} testID="camera-blocked">
      <Text style={styles.blockedMessage}>{message}</Text>
      {onAction && actionLabel ? (
        <FormButton label={actionLabel} onPress={onAction} />
      ) : null}
      <FormButton label="Close" onPress={onClose} variant="secondary" />
    </SafeAreaView>
  );
}

function IconButton({
  label,
  name,
  onPress,
  testID,
}: {
  label: string;
  name: 'x' | 'refresh-cw';
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={styles.iconButton}
      testID={testID}
    >
      <Feather color={colors.text} name={name} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  chrome: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  topSpacer: {
    width: 44,
  },
  hintBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  kicker: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  hint: {
    color: colors.text,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  viewfinder: {
    flex: 1,
    marginVertical: spacing.lg,
  },
  tick: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: colors.accent,
  },
  tickTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  tickTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  tickBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  tickBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  previewStage: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
  },
  bottomSpacer: {
    width: 44,
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterPressed: {
    opacity: 0.7,
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewChrome: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  previewActions: {
    gap: spacing.sm,
  },
  blocked: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  blockedMessage: {
    color: colors.muted,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
    lineHeight: 24,
  },
});
