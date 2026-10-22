import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { CameraView, type CameraType, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeckButton, DeckNavButton } from '@/components/deck';
import { Glyph, type GlyphName } from '@/components/icons';
import {
  CAMERA_FAILED_MESSAGE,
  type CapturedSelfie,
  SIMULATOR_CAMERA_MESSAGE,
} from '@/lib/capture-selfie';
import { isPhysicalDevice } from '@/lib/is-physical-device';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { GYM_COPY, PHOTO_CHECK_COPY } from './constants/doing-copy';
import { useTakePhoto } from './useTakePhoto';

const SHUTTER_SIZE = 78;
const CORNER_SIZE = 34;

interface CaptureCameraScreenProps {
  pill: { glyph: GlyphName; label: string };
  /** One line on what has to be in the frame. */
  hint: string;
  facing: CameraType;
  onClose: () => void;
  onUse: (photo: CapturedSelfie) => void;
  /** The chosen photo is being checked. */
  isChecking: boolean;
  /** Why the last photo was not accepted; it is retaken from here. */
  checkError: string | null;
}

/** A full-phone camera: frame, shutter, then the photo full size with Retake beside Use photo. */
export function CaptureCameraScreen(props: CaptureCameraScreenProps) {
  const styles = useThemedStyles(createStyles);
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<CapturedSelfie | null>(null);

  if (!isPhysicalDevice()) {
    return <BlockedCamera message={SIMULATOR_CAMERA_MESSAGE} onClose={props.onClose} />;
  }

  if (!permission) {
    return <View style={styles.screen} testID="camera-permission-loading" />;
  }

  if (!permission.granted) {
    return (
      <BlockedCamera
        message={CAMERA_FAILED_MESSAGE}
        onAllow={() => void requestPermission()}
        onClose={props.onClose}
      />
    );
  }

  if (photo) {
    return <PhotoPreview {...props} onRetake={() => setPhoto(null)} photo={photo} />;
  }

  return <LiveCamera {...props} onTaken={setPhoto} />;
}

function LiveCamera({
  pill,
  hint,
  facing: initialFacing,
  onClose,
  onTaken,
}: CaptureCameraScreenProps & { onTaken: (photo: CapturedSelfie) => void }) {
  const { camera } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const { takePhoto, isCapturing } = useTakePhoto(cameraRef);
  const [facing, setFacing] = useState<CameraType>(initialFacing);
  const [message, setMessage] = useState<string | null>(null);

  async function shoot() {
    const captured = await takePhoto();
    if (captured.status === 'captured') {
      onTaken(captured.photo);
      return;
    }

    setMessage(captured.status === 'failed' ? captured.message : null);
  }

  return (
    <View style={styles.screen} testID="capture-camera-screen">
      <CameraView facing={facing} ref={cameraRef} style={StyleSheet.absoluteFill} />
      <FrameCorners />
      <View style={[styles.topBar, { top: insets.top + spacing.sm }]}>
        <DeckNavButton
          accessibilityLabel={GYM_COPY.close}
          glyph="close"
          onPress={onClose}
          overCamera
          testID="camera-close"
        />
        <View style={styles.pill}>
          <Glyph color={camera.text} name={pill.glyph} size={15} strokeWidth={2} />
          <Text style={styles.pillText}>{pill.label}</Text>
        </View>
        <DeckNavButton
          accessibilityLabel={GYM_COPY.flip}
          glyph="flip"
          onPress={() => setFacing((current) => (current === 'front' ? 'back' : 'front'))}
          overCamera
          testID="camera-flip"
        />
      </View>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Text style={styles.hint}>{message ?? hint}</Text>
        <Pressable
          accessibilityLabel="Take photo"
          accessibilityRole="button"
          disabled={isCapturing}
          onPress={() => void shoot()}
          style={({ pressed }) => [
            styles.shutter,
            pressed || isCapturing ? styles.shutterPressed : null,
          ]}
          testID="camera-shutter"
        >
          <View style={styles.shutterCore} />
        </Pressable>
      </View>
    </View>
  );
}

/** Soft corners that show the frame without a paragraph about it. */
function FrameCorners() {
  const styles = useThemedStyles(createStyles);
  return (
    <View pointerEvents="none" style={styles.corners}>
      <View style={[styles.corner, styles.cornerTopLeft]} />
      <View style={[styles.corner, styles.cornerTopRight]} />
      <View style={[styles.corner, styles.cornerBottomLeft]} />
      <View style={[styles.corner, styles.cornerBottomRight]} />
    </View>
  );
}

function PhotoPreview({
  photo,
  onRetake,
  onUse,
  isChecking,
  checkError,
}: CaptureCameraScreenProps & { photo: CapturedSelfie; onRetake: () => void }) {
  const { camera } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen} testID="camera-preview-screen">
      <Image
        source={{ uri: photo.previewUri }}
        style={StyleSheet.absoluteFill}
        testID="camera-preview-image"
      />
      {isChecking ? (
        <View style={styles.checking}>
          <ActivityIndicator color={camera.text} size="large" />
          <Text style={styles.hint}>{GYM_COPY.checking}</Text>
        </View>
      ) : null}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        {checkError ? <Text style={styles.hint}>{checkError}</Text> : null}
        <View style={styles.choices}>
          <DeckButton
            disabled={isChecking}
            isFlexible
            label={GYM_COPY.retake}
            onPress={onRetake}
            testID="camera-retake"
            variant="cameraGlass"
          />
          {checkError ? null : (
            <DeckButton
              isFlexible
              label={GYM_COPY.usePhoto}
              loading={isChecking}
              onPress={() => onUse(photo)}
              testID="camera-use-photo"
              variant="cameraSolid"
            />
          )}
        </View>
      </View>
    </View>
  );
}

function BlockedCamera({
  message,
  onAllow,
  onClose,
}: {
  message: string;
  onAllow?: () => void;
  onClose: () => void;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.screen, styles.blocked]} testID="camera-blocked">
      <Text style={styles.hint}>{message}</Text>
      {onAllow ? (
        <DeckButton label={PHOTO_CHECK_COPY.allowCamera} onPress={onAllow} variant="cameraSolid" />
      ) : null}
      <DeckButton label="Close" onPress={onClose} variant="cameraGlass" />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    blocked: {
      justifyContent: 'center',
      padding: spacing.lg,
      gap: spacing.md,
    },
    topBar: {
      position: 'absolute',
      left: 18,
      right: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      height: 36,
      paddingHorizontal: 14,
      borderRadius: radii.full,
      backgroundColor: theme.camera.pill,
    },
    pillText: {
      color: theme.camera.text,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
    },
    corners: {
      position: 'absolute',
      left: spacing.xl,
      right: spacing.xl,
      top: '17%',
      bottom: '28%',
    },
    corner: {
      position: 'absolute',
      width: CORNER_SIZE,
      height: CORNER_SIZE,
      borderColor: theme.camera.text,
    },
    cornerTopLeft: {
      left: 0,
      top: 0,
      borderLeftWidth: 3,
      borderTopWidth: 3,
      borderTopLeftRadius: 14,
    },
    cornerTopRight: {
      right: 0,
      top: 0,
      borderRightWidth: 3,
      borderTopWidth: 3,
      borderTopRightRadius: 14,
    },
    cornerBottomLeft: {
      left: 0,
      bottom: 0,
      borderLeftWidth: 3,
      borderBottomWidth: 3,
      borderBottomLeftRadius: 14,
    },
    cornerBottomRight: {
      right: 0,
      bottom: 0,
      borderRightWidth: 3,
      borderBottomWidth: 3,
      borderBottomRightRadius: 14,
    },
    bottom: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingTop: 26,
      paddingHorizontal: 22,
      alignItems: 'center',
      gap: 18,
      backgroundColor: theme.camera.pill,
    },
    hint: {
      color: theme.camera.text,
      fontSize: 15.5,
      fontWeight: fontWeight.medium,
      lineHeight: 22,
      textAlign: 'center',
    },
    shutter: {
      width: SHUTTER_SIZE,
      height: SHUTTER_SIZE,
      borderRadius: SHUTTER_SIZE / 2,
      borderWidth: 4,
      borderColor: theme.camera.solid,
      alignItems: 'center',
      justifyContent: 'center',
    },
    shutterPressed: {
      opacity: 0.7,
    },
    shutterCore: {
      width: SHUTTER_SIZE - 16,
      height: SHUTTER_SIZE - 16,
      borderRadius: (SHUTTER_SIZE - 16) / 2,
      backgroundColor: theme.camera.solid,
    },
    checking: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      backgroundColor: theme.camera.pill,
    },
    choices: {
      flexDirection: 'row',
      gap: 10,
      alignSelf: 'stretch',
    },
  });
