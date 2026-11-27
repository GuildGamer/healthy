import { radii, spacing } from '@product/brand';
import { StyleSheet, View } from 'react-native';
import { DECK_PAGE_CARD_RADIUS } from '@/components/deck';
import { type Theme, useThemedStyles } from '@/theme';
import { PROGRESS_STAT_RADIUS } from './constants/progress-layout';

const CARD_HEIGHT = 196;
const STAT_HEIGHT = 70;
const ROW_COUNT = 3;
const DISC_SIZE = 38;

/** The week card, the three figures and the rows, holding their shape while they load. */
export function ProgressSkeleton() {
  const styles = useThemedStyles(createStyles);

  return (
    <View accessibilityLabel="Loading your week" testID="progress-loading">
      <View style={styles.card} />
      <View style={styles.stats}>
        {Array.from({ length: ROW_COUNT }, (_, index) => (
          <View key={`stat-${index}`} style={styles.stat} />
        ))}
      </View>
      <View style={styles.rows}>
        {Array.from({ length: ROW_COUNT }, (_, index) => (
          <View key={`row-${index}`} style={styles.row}>
            <View style={styles.disc} />
            <View style={styles.lines}>
              <View style={[styles.line, styles.titleLine]} />
              <View style={[styles.line, styles.metaLine]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      height: CARD_HEIGHT,
      borderRadius: DECK_PAGE_CARD_RADIUS,
      marginTop: spacing.md,
      backgroundColor: theme.colors.surface,
    },
    stats: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
    },
    stat: {
      flex: 1,
      height: STAT_HEIGHT,
      borderRadius: PROGRESS_STAT_RADIUS,
      backgroundColor: theme.colors.surface,
    },
    rows: {
      marginTop: 18,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: spacing.xs,
    },
    disc: {
      width: DISC_SIZE,
      height: DISC_SIZE,
      borderRadius: DISC_SIZE / 2,
      backgroundColor: theme.colors.surface,
    },
    lines: {
      flex: 1,
      gap: spacing.sm,
    },
    line: {
      borderRadius: radii.sm,
      backgroundColor: theme.colors.surface,
    },
    titleLine: {
      width: '40%',
      height: 14,
    },
    metaLine: {
      width: '65%',
      height: 11,
    },
  });
