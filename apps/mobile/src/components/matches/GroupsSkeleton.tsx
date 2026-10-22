import { spacing } from '@product/brand';
import { StyleSheet, View } from 'react-native';
import { DeckSectionTitle } from '@/components/deck';
import { type Theme, useThemedStyles } from '@/theme';
import { GROUPS_COPY } from './match-copy';

const SKELETON_ROWS = 2;
const SKELETON_FACES = 4;
const DISC_SIZE = 38;
const FACE_SIZE = 26;

/** Row-shaped outlines with empty face circles, so the list keeps its shape as it lands. */
export function GroupsSkeleton() {
  const styles = useThemedStyles(createStyles);

  return (
    <View
      accessibilityLabel="Loading groups"
      accessibilityRole="progressbar"
      testID="matches-list-loading"
    >
      <DeckSectionTitle isFirst label={GROUPS_COPY.live} />
      {Array.from({ length: SKELETON_ROWS }, (_unused, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          <View style={styles.disc} />
          <View style={styles.text}>
            <View style={[styles.bone, styles.titleBone]} />
            <View style={styles.faces}>
              {Array.from({ length: SKELETON_FACES }, (_face, faceIndex) => (
                <View key={faceIndex} style={styles.face} />
              ))}
            </View>
          </View>
          <View style={[styles.bone, styles.sideBone]} />
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
      width: '55%',
      height: 14,
    },
    sideBone: {
      width: 44,
      height: 30,
    },
    faces: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginTop: 9,
    },
    face: {
      width: FACE_SIZE,
      height: FACE_SIZE,
      borderRadius: FACE_SIZE / 2,
      backgroundColor: theme.colors.surface,
    },
  });
