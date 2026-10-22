import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { RefObject } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { DeckButton, DeckSheetSub, DeckSheetTitle } from '@/components/deck';
import { Glyph, type GlyphName } from '@/components/icons';
import { isPhysicalDevice } from '@/lib/is-physical-device';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { PHOTO_CHECK_COPY } from './constants/doing-copy';
import { photoCheckTimeLabel } from './photo-check';

const PREVIEW_HEIGHT = 300;
const RESULT_ICON_SIZE = 56;

/** The live camera inside the sheet, or the shot being checked with a spinner over it. */
export function PhotoCheckPreview({
  cameraRef,
  shotUri,
}: {
  cameraRef: RefObject<CameraView | null>;
  shotUri: string | null;
}) {
  const { camera } = useTheme();
  const styles = useThemedStyles(createStyles);

  if (shotUri) {
    return (
      <View style={styles.preview} testID="photo-check-shot">
        <Image source={{ uri: shotUri }} style={[StyleSheet.absoluteFill, styles.dimmed]} />
        <ActivityIndicator color={camera.text} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.preview}>
      <LiveCamera cameraRef={cameraRef} />
    </View>
  );
}

function LiveCamera({ cameraRef }: { cameraRef: RefObject<CameraView | null> }) {
  const styles = useThemedStyles(createStyles);
  const [permission, requestPermission] = useCameraPermissions();

  if (!isPhysicalDevice()) {
    return <Text style={styles.previewNote}>{PHOTO_CHECK_COPY.simulator}</Text>;
  }

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permission}>
        <Text style={styles.previewNote}>{PHOTO_CHECK_COPY.cameraNeeded}</Text>
        <DeckButton
          label={PHOTO_CHECK_COPY.allowCamera}
          onPress={() => void requestPermission()}
          variant="cameraGlass"
        />
      </View>
    );
  }

  return (
    <CameraView
      facing="back"
      ref={cameraRef}
      style={StyleSheet.absoluteFill}
      testID="photo-check-camera"
    />
  );
}

export function PhotoCheckTime({ secondsLeft }: { secondsLeft: number }) {
  const styles = useThemedStyles(createStyles);
  return (
    <Text style={styles.time} testID="evidence-request-timer">
      {photoCheckTimeLabel(secondsLeft)}
    </Text>
  );
}

interface PhotoCheckResultProps {
  glyph: GlyphName;
  title: string;
  sub: string;
  penaltyPoints: number;
  factLabel: string;
  actionLabel: string;
  isBusy: boolean;
  onAction: () => void;
}

/** A calm outcome: what happened, what it costs, and one way on. No red, no alarm. */
export function PhotoCheckResult({
  glyph,
  title,
  sub,
  penaltyPoints,
  factLabel,
  actionLabel,
  isBusy,
  onAction,
}: PhotoCheckResultProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View testID="photo-check-result">
      <View style={styles.resultIcon}>
        <Glyph color={colors.muted} name={glyph} size={26} strokeWidth={2} />
      </View>
      <DeckSheetTitle>{title}</DeckSheetTitle>
      <DeckSheetSub>{sub}</DeckSheetSub>
      <View style={styles.fact}>
        <Text style={styles.factValue}>−{penaltyPoints}</Text>
        <Text style={styles.factLabel}>{factLabel}</Text>
      </View>
      <View style={styles.resultAction}>
        <DeckButton
          label={actionLabel}
          loading={isBusy}
          onPress={onAction}
          testID="photo-check-action"
        />
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    preview: {
      height: PREVIEW_HEIGHT,
      borderRadius: radii.xl,
      overflow: 'hidden',
      marginTop: spacing.md,
      backgroundColor: '#000000',
      alignItems: 'center',
      justifyContent: 'center',
    },
    dimmed: {
      opacity: 0.75,
    },
    permission: {
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    previewNote: {
      color: theme.camera.subtext,
      fontSize: fontSize.sm,
      textAlign: 'center',
      paddingHorizontal: spacing.lg,
    },
    time: {
      color: theme.colors.muted,
      fontSize: 13,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    resultIcon: {
      width: RESULT_ICON_SIZE,
      height: RESULT_ICON_SIZE,
      borderRadius: RESULT_ICON_SIZE / 2,
      backgroundColor: theme.colors.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 6,
      marginBottom: 6,
    },
    fact: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.sm,
      marginTop: 20,
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
      borderRadius: radii.lg,
      backgroundColor: theme.colors.surfaceRaised,
    },
    factValue: {
      color: theme.colors.text,
      fontSize: 26,
      fontWeight: fontWeight.semibold,
      letterSpacing: -0.5,
    },
    factLabel: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
    },
    resultAction: {
      marginTop: 22,
    },
  });
