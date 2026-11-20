import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { poseTargetBadge } from '@/components/challenges/pose-session-copy';
import { DECK_REP_COUNT_SIZE } from '@/components/deck';
import { Glyph } from '@/components/icons';
import { playGoalReachedHaptic } from '@/lib/haptics';
import { type Theme, useTheme, useThemedStyles } from '@/theme';

/** Enough beats to catch the eye mid-rep, few enough to stop nagging. */
const CELEBRATION_PULSES = 3;
const PULSE_IN_MS = 220;
const PULSE_OUT_MS = 380;

/** The count, huge, readable from the floor; nothing else competes with it. */
export function PoseCountHud({
  count,
  target,
  meta,
}: {
  count: number;
  /** Required reps. Zero means the session is untargeted, as in match play. */
  target: number;
  /** A quiet line under the count, such as a framing correction. */
  meta: string | null;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const badge = poseTargetBadge({ count, target });
  const targetReached = badge !== null;
  const pulse = useSharedValue(0);
  const reveal = useSharedValue(0);

  useEffect(() => {
    if (!targetReached) {
      pulse.value = 0;
      reveal.value = 0;
      return;
    }

    void playGoalReachedHaptic();
    reveal.value = withTiming(1, { duration: PULSE_IN_MS });
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: PULSE_IN_MS, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: PULSE_OUT_MS, easing: Easing.in(Easing.cubic) }),
      ),
      CELEBRATION_PULSES,
      false,
    );
  }, [pulse, reveal, targetReached]);

  const countStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.08]) }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ translateY: interpolate(reveal.value, [0, 1], [8, 0]) }],
  }));

  return (
    <View pointerEvents="none" style={styles.hud} testID="pose-hud">
      <Animated.Text style={[styles.count, countStyle]} testID="pose-count">
        {count}
      </Animated.Text>
      {target > 0 ? (
        <Text style={styles.target} testID="pose-target">
          of {target}
        </Text>
      ) : null}
      {badge ? (
        <Animated.View style={[styles.badge, badgeStyle]} testID="pose-target-badge">
          <Glyph color={colors.onPrimary} name="check" size={14} strokeWidth={2.6} />
          <Text style={styles.badgeText}>{badge}</Text>
        </Animated.View>
      ) : null}
      {meta ? (
        <Text style={styles.meta} testID="pose-status">
          {meta}
        </Text>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    hud: {
      position: 'absolute',
      top: 120,
      left: spacing.lg,
      right: spacing.lg,
      alignItems: 'center',
      gap: spacing.xs,
    },
    count: {
      color: theme.camera.text,
      fontSize: DECK_REP_COUNT_SIZE,
      fontWeight: fontWeight.semibold,
      letterSpacing: -8,
      lineHeight: DECK_REP_COUNT_SIZE,
      fontVariant: ['tabular-nums'],
      textShadowColor: theme.camera.pill,
      textShadowOffset: { width: 0, height: 6 },
      textShadowRadius: 30,
    },
    target: {
      color: theme.camera.subtext,
      fontSize: fontSize.lg,
      fontWeight: fontWeight.medium,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: spacing.xs + 1,
      borderRadius: radii.full,
      backgroundColor: theme.colors.primary,
    },
    badgeText: {
      color: theme.colors.onPrimary,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
    },
    meta: {
      color: theme.camera.text,
      fontSize: fontSize.md,
      fontWeight: fontWeight.medium,
      textAlign: 'center',
      marginTop: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      overflow: 'hidden',
      backgroundColor: theme.camera.pill,
    },
  });
