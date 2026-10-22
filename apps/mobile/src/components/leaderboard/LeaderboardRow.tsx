import type { LeaderboardEntry } from '@product/client';
import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { formatPoints } from '@/components/points';
import { type Theme, useThemedStyles } from '@/theme';
import { BOARD_COPY } from './constants/board';

const RANK_WIDTH = 26;

/** A name and a score, and nothing else. You are "You", so your name is never read back. */
export function LeaderboardRow({ entry, isFirst }: { entry: LeaderboardEntry; isFirst: boolean }) {
  const styles = useThemedStyles(createStyles);
  const name = entry.isCurrentUser ? BOARD_COPY.you : entry.displayName;

  return (
    <View
      accessibilityLabel={`${entry.rank}. ${name}, ${entry.points} points`}
      style={[
        styles.row,
        isFirst || entry.isCurrentUser ? null : styles.divider,
        entry.isCurrentUser ? styles.you : null,
      ]}
      testID={`leaderboard-row-${entry.rank}`}
    >
      <Text style={styles.rank}>{entry.rank}</Text>
      <Text numberOfLines={1} style={styles.name}>
        {name}
      </Text>
      <Text style={styles.points}>{formatPoints(entry.points)}</Text>
    </View>
  );
}

/** The "···" between the top three and the people around you. */
export function LeaderboardGap() {
  const styles = useThemedStyles(createStyles);
  return (
    <Text accessibilityElementsHidden style={styles.gap} testID="leaderboard-gap">
      ···
    </Text>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 11,
      paddingHorizontal: spacing.xs,
    },
    divider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    you: {
      marginHorizontal: -spacing.sm,
      paddingHorizontal: 12,
      borderRadius: radii.md + 2,
      backgroundColor: theme.colors.surface,
    },
    rank: {
      width: RANK_WIDTH,
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      textAlign: 'center',
    },
    name: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 15,
    },
    points: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: fontWeight.semibold,
    },
    gap: {
      color: theme.colors.muted,
      fontSize: 13,
      letterSpacing: 3,
      textAlign: 'center',
      paddingVertical: 6,
    },
  });
