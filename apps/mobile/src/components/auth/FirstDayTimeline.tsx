import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { Glyph } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles, withAlpha } from '@/theme';
import type { FirstDay, FirstDayStep } from './first-day';

const NODE_SIZE = 36;
const RAIL_WIDTH = 1.5;

/** The first day as a short timeline: one rail, one node per challenge. */
export function FirstDayTimeline({ day }: { day: FirstDay }) {
  const styles = useThemedStyles(createStyles);

  return (
    <View testID="first-day-timeline">
      <View style={styles.timeline}>
        {day.steps.length > 1 ? <View style={styles.rail} /> : null}
        {day.steps.map((step) => (
          <TimelineStep key={step.challengeId} step={step} />
        ))}
      </View>
      {day.hiddenCount > 0 ? (
        <Text style={styles.more}>and {day.hiddenCount} more in Challenges</Text>
      ) : null}
    </View>
  );
}

function TimelineStep({ step }: { step: FirstDayStep }) {
  const { conditionTones } = useTheme();
  const styles = useThemedStyles(createStyles);
  const tone = conditionTones[step.category];

  return (
    <View style={styles.step}>
      <View style={[styles.node, { borderColor: withAlpha(tone, 0.6) }]}>
        <Glyph color={tone} name={step.glyph} size={19} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{step.title}</Text>
        <Text numberOfLines={2} style={styles.meta}>
          {step.description}
        </Text>
      </View>
    </View>
  );
}

/** A dashed space that holds the timeline's place until there is one. */
export function FirstDayPlaceholder({
  message,
  offline = false,
}: {
  message: string;
  offline?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.placeholder} testID="first-day-placeholder">
      {offline ? <Glyph color={colors.muted} name="offline" size={22} strokeWidth={2} /> : null}
      <Text style={styles.placeholderText}>{message}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    timeline: {
      position: 'relative',
    },
    rail: {
      position: 'absolute',
      left: NODE_SIZE / 2 - RAIL_WIDTH / 2,
      top: NODE_SIZE / 2,
      bottom: NODE_SIZE / 2,
      width: RAIL_WIDTH,
      backgroundColor: theme.colors.border,
    },
    step: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: 6,
    },
    node: {
      width: NODE_SIZE,
      height: NODE_SIZE,
      borderRadius: radii.full,
      borderWidth: RAIL_WIDTH,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
    },
    copy: {
      flex: 1,
      gap: 2,
    },
    title: {
      color: theme.colors.text,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
    },
    meta: {
      color: theme.colors.muted,
      fontSize: fontSize.xs,
      lineHeight: 17,
    },
    more: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      marginTop: spacing.xs,
    },
    placeholder: {
      minHeight: 180,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderRadius: radii.lg,
      borderWidth: RAIL_WIDTH,
      borderStyle: 'dashed',
      borderColor: theme.colors.border,
      paddingHorizontal: spacing.xl,
    },
    placeholderText: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      lineHeight: 20,
      textAlign: 'center',
    },
  });
