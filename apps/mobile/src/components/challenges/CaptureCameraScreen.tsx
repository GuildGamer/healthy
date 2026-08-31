import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, fontWeight, spacing } from '@product/brand';
import {
  CameraView,
  type CameraType,
  useCameraPermissions,
} from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormButton, FormErrorBanner } from '@/components/forms';
import {
  CAMERA_FAILED_MESSAGE,
  PHOTO_MISSING_MESSAGE,
  SIMULATOR_CAMERA_MESSAGE,
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
  selfie: 'A selfie at the gym or clearly mid-workout.',
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
        quality: 0.6,
        shutterSound: false,
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
          <Text style={styles.hint}>{HINT[intent]}</Text>
          <View style={styles.topSpacer} />
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
      <Image
        accessibilityIgnoresInvertColors
        source={{ uri: photo.previewUri }}
        style={StyleSheet.absoluteFill}
        testID="camera-preview-image"
      />
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
    justifyContent: 'space-between',
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
  hint: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    textAlign: 'center',
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
    flex: 1,
    justifyContent: 'flex-end',
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
