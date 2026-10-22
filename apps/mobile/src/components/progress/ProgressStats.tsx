import { fontWeight, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { type Theme, useThemedStyles } from '@/theme';
import { PROGRESS_STAT_RADIUS } from './constants/progress-layout';

export interface ProgressStat {
  value: string;
  /** Quiet text beside the value, such as "best 12". */
  aside?: string | null;
  label: string;
  testID: string;
}

/** Three small figures under the week: the run, points, and this week's place. */
export function ProgressStats({ stats }: { stats: readonly ProgressStat[] }) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.row}>
      {stats.map((stat) => (
        <View
          accessibilityLabel={[stat.value, stat.aside, stat.label].filter(Boolean).join(' ')}
          key={stat.testID}
          style={styles.stat}
          testID={stat.testID}
        >
          <Text numberOfLines={1} style={styles.value}>
            {stat.value}
            {stat.aside ? <Text style={styles.aside}>{`  ${stat.aside}`}</Text> : null}
          </Text>
          <Text numberOfLines={1} style={styles.label}>
            {stat.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
    },
    stat: {
      flex: 1,
      padding: 14,
      borderRadius: PROGRESS_STAT_RADIUS,
      backgroundColor: theme.colors.surface,
      gap: 2,
    },
    value: {
      color: theme.colors.text,
      fontSize: 24,
      fontWeight: fontWeight.semibold,
      letterSpacing: -0.5,
    },
    aside: {
      color: theme.colors.muted,
      fontSize: 12.5,
      fontWeight: fontWeight.medium,
      letterSpacing: 0,
    },
    label: {
      color: theme.colors.muted,
      fontSize: 12.5,
      marginTop: spacing.xs / 2,
    },
  });
