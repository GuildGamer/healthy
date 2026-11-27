import { spacing } from '@product/brand';
import { StyleSheet, View } from 'react-native';
import { type Theme, useThemedStyles } from '@/theme';
import { ROUTINE_COPY } from './constants/routine-copy';
import { ListSectionTitle } from './ListSectionTitle';

const SKELETON_ROWS = 4;
const DISC_SIZE = 38;

/** Row-shaped outlines under a real heading, so nothing jumps when the list lands. */
export function RoutineSkeleton() {
  const styles = useThemedStyles(createStyles);

  return (
    <View
      accessibilityLabel={ROUTINE_COPY.loading}
      accessibilityRole="progressbar"
      testID="routine-loading"
    >
      <ListSectionTitle isFirst label={ROUTINE_COPY.rhythmTitle.daily} />
      {Array.from({ length: SKELETON_ROWS }, (_unused, index) => (
        <View key={index} style={styles.row}>
          <View style={styles.disc} />
          <View style={styles.text}>
            <View style={[styles.bone, styles.titleBone]} />
            <View style={[styles.bone, styles.metaBone]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
    text: {
      flex: 1,
    },
    bone: {
      borderRadius: spacing.sm,
      backgroundColor: theme.colors.surface,
    },
    titleBone: {
      width: '60%',
      height: 14,
    },
    metaBone: {
      width: '35%',
      height: 11,
      marginTop: 7,
    },
  });
