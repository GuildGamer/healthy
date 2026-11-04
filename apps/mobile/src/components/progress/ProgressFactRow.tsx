import { fontSize, fontWeight, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { type Theme, useTheme, useThemedStyles } from '@/theme';

export type ProgressFact = {
  label: string;
  value: string;
};

/** Stats under a period hero — wraps when a recap lists several workouts. */
export function ProgressFactRow({
  facts,
  testID = 'progress-fact-row',
}: {
  facts: readonly ProgressFact[];
  testID?: string;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  if (facts.length === 0) {
    return null;
  }

  return (
    <View style={styles.row} testID={testID}>
      {facts.map((fact) => (
        <View key={fact.label} style={styles.cell}>
          <Text style={[styles.value, { color: colors.text }]}>{fact.value}</Text>
          <Text style={[styles.label, { color: colors.muted }]}>{fact.label}</Text>
        </View>
      ))}
    </View>
  );
}

const createStyles = (_theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      marginBottom: spacing.xl,
    },
    cell: {
      flexGrow: 1,
      flexBasis: '28%',
      minWidth: 88,
      gap: spacing.xs,
    },
    value: {
      fontSize: 22,
      fontWeight: fontWeight.semibold,
      letterSpacing: -0.4,
    },
    label: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
    },
  });
