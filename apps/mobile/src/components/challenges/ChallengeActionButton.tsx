import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import type {
  ChallengeCaptureKind,
  ChallengeCompletionKind,
  UserChallengeStatus,
} from '@product/client';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

/**
 * The pill is 32pt tall so it sits comfortably in a list row; hit slop pads the
 * touch target back out to the 44pt minimum in WCAG 2.5.5.
 */
const PILL_HEIGHT = 32;
const PILL_WIDTH = 88;
const MIN_TARGET_SIZE = 44;
const VERTICAL_HIT_SLOP = (MIN_TARGET_SIZE - PILL_HEIGHT) / 2;

type ChallengeActionButtonProps = {
  status: UserChallengeStatus;
  completionKind?: ChallengeCompletionKind;
  captureKind?: ChallengeCaptureKind;
  isBusy: boolean;
  onPress: () => void;
  testID?: string;
};

/**
 * Three-step ladder for a daily challenge: a tonal pill invites the first tap,
 * a filled pill marks the one challenge the user is mid-way through, and a
 * completed challenge drops to a static label so it stops competing for taps.
 */
export function ChallengeActionButton({
  status,
  completionKind = 'check_in',
  captureKind,
  isBusy,
  onPress,
  testID,
}: ChallengeActionButtonProps) {
  if (status === 'completed') {
    return (
      <View style={styles.doneBadge}>
        <Feather color={colors.accent} name="check" size={14} />
        <Text style={styles.doneLabel}>Done</Text>
      </View>
    );
  }

  const isInProgress =
    status === 'in_progress' || status === 'awaiting_evidence';
  const foreground = isInProgress ? colors.onAccent : colors.accent;
  const isDevice =
    captureKind === 'device_session' || captureKind === 'device_sample';
  const label =
    status === 'awaiting_evidence'
      ? 'Photo'
      : isInProgress
        ? isDevice
          ? 'Resume'
          : completionKind === 'check_in'
            ? 'Confirm'
            : 'Resume'
        : isDevice && captureKind === 'device_session'
          ? 'Start'
          : 'Log';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: isBusy, disabled: isBusy }}
      disabled={isBusy}
      hitSlop={{
        top: VERTICAL_HIT_SLOP,
        bottom: VERTICAL_HIT_SLOP,
        left: spacing.sm,
        right: spacing.sm,
      }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        isInProgress ? styles.pillFilled : styles.pillTonal,
        pressed && (isInProgress ? styles.pillFilledPressed : styles.pillTonalPressed),
      ]}
      testID={testID}
    >
      {isBusy ? (
        <ActivityIndicator color={foreground} size="small" />
      ) : (
        <Text style={[styles.label, { color: foreground }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: PILL_HEIGHT,
    width: PILL_WIDTH,
    flexShrink: 0,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillTonal: {
    backgroundColor: colors.accentContainer,
    borderColor: colors.accent,
  },
  pillTonalPressed: {
    backgroundColor: colors.accentContainerPressed,
  },
  pillFilled: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  pillFilledPressed: {
    backgroundColor: colors.accentPressed,
    borderColor: colors.accentPressed,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    flexShrink: 0,
    height: PILL_HEIGHT,
    width: PILL_WIDTH,
  },
  doneLabel: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
});
