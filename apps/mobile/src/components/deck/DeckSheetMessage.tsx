import { fontSize, radii, spacing } from '@product/brand';
import { StyleSheet, Text } from 'react-native';
import { type Theme, useThemedStyles, withAlpha } from '@/theme';

/** One plain line under a reading when something needs fixing; never about your health. */
export function DeckSheetMessage({ message, testID }: { message: string; testID?: string }) {
  const styles = useThemedStyles(createStyles);

  return (
    <Text
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={styles.message}
      testID={testID}
    >
      {message}
    </Text>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    message: {
      marginTop: 14,
      paddingHorizontal: 14,
      paddingVertical: spacing.md - spacing.xs,
      borderRadius: radii.lg,
      overflow: 'hidden',
      backgroundColor: withAlpha(theme.colors.danger, 0.12),
      color: theme.colors.danger,
      fontSize: fontSize.sm,
      lineHeight: 20,
    },
  });
