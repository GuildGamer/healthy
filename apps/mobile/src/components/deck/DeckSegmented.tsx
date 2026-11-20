import { fontSize, fontWeight, radii } from '@product/brand';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type Theme, useThemedStyles, withAlpha } from '@/theme';

export type DeckSegmentOption<Id extends string> = {
  id: Id;
  label: string;
};

interface DeckSegmentedProps<Id extends string> {
  options: readonly DeckSegmentOption<Id>[];
  selected: Id;
  onSelect: (id: Id) => void;
  /** Sits in a settings row on a sheet, sized to its labels rather than the row. */
  isCompact?: boolean;
  disabled?: boolean;
  testID?: string;
}

/** A switch between a few choices: Mine or Groups, or how often a challenge runs. */
export function DeckSegmented<Id extends string>({
  options,
  selected,
  onSelect,
  isCompact = false,
  disabled = false,
  testID,
}: DeckSegmentedProps<Id>) {
  const styles = useThemedStyles(createStyles);

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.track, isCompact ? styles.compactTrack : null]}
      testID={testID}
    >
      {options.map((option) => {
        const isSelected = option.id === selected;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected, disabled }}
            disabled={disabled}
            key={option.id}
            onPress={() => onSelect(option.id)}
            style={[
              styles.segment,
              isCompact ? styles.compactSegment : null,
              isSelected ? styles.selected : null,
            ]}
            testID={testID ? `${testID}-${option.id}` : undefined}
          >
            <Text
              style={[
                styles.label,
                isCompact ? styles.compactLabel : null,
                isSelected ? styles.selectedLabel : null,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      padding: 3,
      borderRadius: 13,
      backgroundColor: theme.colors.surface,
    },
    compactTrack: {
      borderRadius: 11,
      backgroundColor: theme.colors.surfaceRaised,
    },
    segment: {
      flex: 1,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    compactSegment: {
      flex: 0,
      height: 30,
      paddingHorizontal: 11,
      borderRadius: radii.sm,
    },
    selected: {
      backgroundColor: withAlpha(theme.colors.text, 0.1),
    },
    label: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
    },
    compactLabel: {
      fontSize: 13,
    },
    selectedLabel: {
      color: theme.colors.text,
    },
  });
