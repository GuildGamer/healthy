import { fontSize, fontWeight, spacing } from '@product/brand';
import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import type { TallyLabel, TallySegment } from './types/today-deck';

const SEGMENT_HEIGHT = 6;

interface TodayTallyProps {
  segments: readonly TallySegment[];
  winLineAfter: number | null;
  label: TallyLabel | null;
  runLabel: string | null;
  updatedLabel?: string | null;
}

/**
 * One segment per challenge. Open work shows in its own colour, finished work
 * in the brand colour, so colour on the page is earned.
 */
export function TodayTally({
  segments,
  winLineAfter,
  label,
  runLabel,
  updatedLabel = null,
}: TodayTallyProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View testID="home-tally">
      <View style={styles.bar}>
        {segments.map((segment, index) => (
          <Fragment key={segment.id}>
            {winLineAfter === index ? <View style={styles.winLine} testID="home-win-line" /> : null}
            <View style={styles.segment}>
              <View
                style={[
                  styles.segmentFill,
                  {
                    width: `${Math.round(segment.fill * 100)}%`,
                    backgroundColor: segment.isDone
                      ? theme.colors.primary
                      : theme.deckCards.tones[segment.kind],
                  },
                ]}
              />
            </View>
          </Fragment>
        ))}
      </View>
      <View style={styles.labels}>
        {label ? (
          <Text style={styles.label}>
            <Text style={styles.labelStrong}>{label.strong}</Text>
            {label.rest ? ` · ${label.rest}` : null}
          </Text>
        ) : (
          <View style={styles.labelSkeleton} />
        )}
        {runLabel ? <Text style={styles.label}>{runLabel}</Text> : null}
      </View>
      {updatedLabel ? (
        <Text style={styles.updated} testID="home-last-updated">
          {updatedLabel}
        </Text>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: spacing.xs,
    },
    segment: {
      flex: 1,
      height: SEGMENT_HEIGHT,
      borderRadius: SEGMENT_HEIGHT / 2,
      backgroundColor: theme.colors.surfaceRaised,
      overflow: 'hidden',
    },
    segmentFill: {
      height: '100%',
      borderRadius: SEGMENT_HEIGHT / 2,
    },
    winLine: {
      width: 2,
      height: 14,
      marginTop: -4,
      borderRadius: 1,
      backgroundColor: theme.colors.muted,
    },
    labels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    label: {
      color: theme.colors.muted,
      fontSize: 13,
    },
    labelStrong: {
      color: theme.colors.text,
      fontWeight: fontWeight.semibold,
    },
    labelSkeleton: {
      width: 90,
      height: fontSize.xs,
      borderRadius: 6,
      backgroundColor: theme.colors.surfaceRaised,
    },
    updated: {
      color: theme.colors.muted,
      fontSize: fontSize.xs,
      marginTop: spacing.xs,
      paddingHorizontal: spacing.xs,
    },
  });
