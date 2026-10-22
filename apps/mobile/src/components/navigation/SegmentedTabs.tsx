import { fontSize, fontWeight, spacing } from '@product/brand';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type Theme, useThemedStyles } from '@/theme';

export type SegmentedTabOption<Id extends string> = {
  id: Id;
  label: string;
};

/**
 * In-screen tabs: an accent label over an accent rule. Shared so Points,
 * Challenges, and anything else that splits one screen in two read the same
 * way — the app has one switch, not one per feature.
 */
export function SegmentedTabs<Id extends string>({
  onSelect,
  options,
  selected,
  testID,
}: {
  onSelect: (id: Id) => void;
  options: readonly SegmentedTabOption<Id>[];
  selected: Id;
  testID?: string;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.row} testID={testID}>
      {options.map((option) => {
        const isSelected = option.id === selected;

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            key={option.id}
            onPress={() => onSelect(option.id)}
            style={styles.tab}
            testID={testID ? `${testID}-${option.id}` : undefined}
          >
            <Text style={[styles.label, isSelected ? styles.labelSelected : null]}>
              {option.label}
            </Text>
            <View style={[styles.rule, isSelected ? styles.ruleSelected : null]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.sm,
    },
    tab: {
      paddingBottom: 4,
    },
    label: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
    },
    labelSelected: {
      color: theme.colors.accent,
    },
    rule: {
      height: 2,
      marginTop: 4,
      backgroundColor: 'transparent',
    },
    ruleSelected: {
      backgroundColor: theme.colors.accent,
    },
  });
