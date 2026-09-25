import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { poseTargetBadge } from '@/components/challenges/pose-session-copy';
import { displayFontFamily } from '@/lib/fonts';
import { playGoalReachedHaptic } from '@/lib/haptics';

/** Enough beats to catch the eye mid-rep, few enough to stop nagging. */
const CELEBRATION_PULSES = 3;
const PULSE_IN_MS = 220;
const PULSE_OUT_MS = 380;

export function PoseCountHud({
  count,
  target,
  meta,
}: {
  count: number;
  /** Required reps. Zero means the session is untargeted, as in match play. */
  target: number;
  /** Status line under the counter. Null while the coach banner has the floor. */
  meta: string | null;
}) {
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
        withTiming(1, {
          duration: PULSE_IN_MS,
          easing: Easing.out(Easing.cubic),
        }),
        withTiming(0, {
          duration: PULSE_OUT_MS,
          easing: Easing.in(Easing.cubic),
        }),
      ),
      CELEBRATION_PULSES,
      false,
    );
  }, [pulse, reveal, targetReached]);

  const countStyle = useAnimatedStyle(() => ({
    color: interpolateColor(reveal.value, [0, 1], [colors.text, colors.accent]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.16]) }],
  }));

  // A ring drawn outward from the number, so the count stays legible through it.
  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0, 0.85]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.92, 1.45]) }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [
      { translateY: interpolate(reveal.value, [0, 1], [8, 0]) },
      { scale: interpolate(reveal.value, [0, 1], [0.9, 1]) },
    ],
  }));

  return (
    <View pointerEvents="none" style={styles.hud} testID="pose-hud">
      <View style={styles.countRow}>
        <Animated.View style={[styles.ring, ringStyle]} />
        <Animated.Text style={[styles.count, countStyle]} testID="pose-count">
          {count}
          {target > 0 ? (
            <Text style={styles.countTarget}> / {target}</Text>
          ) : null}
        </Animated.Text>
      </View>

      {badge ? (
        <Animated.View
          style={[styles.badge, badgeStyle]}
          testID="pose-target-badge"
        >
          <Feather color={colors.onAccent} name="check" size={14} />
          <Text style={styles.badgeText}>{badge}</Text>
        </Animated.View>
      ) : null}

      {meta ? (
        <Text style={styles.hudMeta} testID="pose-status">
          {meta}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hud: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.md,
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  countRow: {
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    top: -spacing.xs,
    right: -spacing.md,
    bottom: -spacing.xs,
    left: -spacing.md,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: radii.full,
  },
  count: {
    color: colors.text,
    fontFamily: displayFontFamily,
    fontSize: 56,
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  countTarget: {
    color: colors.muted,
    fontSize: 28,
    fontWeight: fontWeight.semibold,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.accent,
  },
  badgeText: {
    color: colors.onAccent,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  hudMeta: {
    color: colors.muted,
    fontSize: fontSize.sm,
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
