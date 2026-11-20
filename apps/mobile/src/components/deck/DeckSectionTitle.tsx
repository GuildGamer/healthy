import { fontSize, fontWeight, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { type Theme, useThemedStyles } from '@/theme';

interface DeckSectionTitleProps {
  label: string;
  /** A quiet total or count on the right, such as "+1,750". */
  corner?: string | null;
  isFirst?: boolean;
  testID?: string;
}

/** A divider list's section label. */
export function DeckSectionTitle({
  label,
  corner = null,
  isFirst = false,
  testID,
}: DeckSectionTitleProps) {
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
