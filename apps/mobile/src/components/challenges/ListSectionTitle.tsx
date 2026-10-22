import { fontSize, fontWeight, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { type Theme, useThemedStyles } from '@/theme';

/** A list's section label, with a quiet count or note on the right. */
export function ListSectionTitle({
  label,
  corner = null,
  isFirst = false,
  testID,
}: {
  label: string;
  corner?: string | null;
  isFirst?: boolean;
  testID?: string;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.row, isFirst ? styles.first : null]} testID={testID}>
      <Text accessibilityRole="header" style={styles.label}>
        {label.toUpperCase()}
      </Text>
      {corner ? <Text style={styles.corner}>{corner}</Text> : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginTop: spacing.lg,
      marginBottom: spacing.xs,
      paddingHorizontal: spacing.xs,
    },
    first: {
      marginTop: spacing.md,
    },
    label: {
      color: theme.colors.muted,
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      letterSpacing: 0.6,
    },
    corner: {
      color: theme.colors.muted,
      fontSize: fontSize.xs,
      fontWeight: fontWeight.medium,
    },
  });
