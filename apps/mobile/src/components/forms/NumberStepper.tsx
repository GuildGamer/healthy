import Feather from '@expo/vector-icons/Feather';
import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { type Theme, useTheme, useThemedStyles } from '@/theme';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function NumberStepper({
  value,
  onChange,
  min,
  max,
  decrementLabel,
  incrementLabel,
  /**
   * Lets the value be typed. Worth turning on only for ranges too wide to
   * reach by tapping — nobody nudges their way from 30 to 300.
   */
  typable = false,
  suffix,
  testID,
}: {
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  decrementLabel: string;
  incrementLabel: string;
  typable?: boolean;
  suffix?: string;
  testID: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const canDecrease = value > min;
  const canIncrease = value < max;

  return (
    <View style={styles.row} testID={testID}>
      <Pressable
        accessibilityLabel={decrementLabel}
        accessibilityRole="button"
        disabled={!canDecrease}
        onPress={() => onChange(clamp(value - 1, min, max))}
        style={[styles.step, canDecrease ? null : styles.stepDisabled]}
        testID={`${testID}-dec`}
      >
        <Feather color={canDecrease ? colors.text : colors.muted} name="minus" size={18} />
      </Pressable>

      <View style={styles.readout}>
        {typable ? (
          <TypedValue
            max={max}
            min={min}
            onChange={onChange}
            testID={`${testID}-value`}
            value={value}
          />
        ) : (
          <Text style={styles.value} testID={`${testID}-value`}>
            {value}
          </Text>
        )}
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>

      <Pressable
        accessibilityLabel={incrementLabel}
        accessibilityRole="button"
        disabled={!canIncrease}
        onPress={() => onChange(clamp(value + 1, min, max))}
        style={[styles.step, canIncrease ? null : styles.stepDisabled]}
        testID={`${testID}-inc`}
      >
        <Feather color={canIncrease ? colors.text : colors.muted} name="plus" size={18} />
      </Pressable>
    </View>
  );
}

/**
 * Held as text while focused so the field can be emptied mid-edit. An empty or
 * junk entry falls back to the last good value rather than to zero.
 */
function TypedValue({
  value,
  onChange,
  min,
  max,
  testID,
}: {
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  testID: string;
}) {
  const styles = useThemedStyles(createStyles);
  const [draft, setDraft] = useState<string | null>(null);

  function commit() {
    const parsed = Number.parseInt(draft ?? '', 10);
    setDraft(null);

    if (Number.isNaN(parsed)) {
      return;
    }

    onChange(clamp(parsed, min, max));
  }

  return (
    <TextInput
      keyboardType="number-pad"
      onBlur={commit}
      onChangeText={(text) => setDraft(text.replace(/[^0-9]/g, ''))}
      onSubmitEditing={commit}
      returnKeyType="done"
      selectTextOnFocus
      style={styles.value}
      testID={testID}
      value={draft ?? String(value)}
    />
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surface,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    step: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.full,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    stepDisabled: {
      opacity: 0.4,
    },
    readout: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.xs,
    },
    value: {
      color: theme.colors.text,
      fontSize: fontSize.xl,
      fontWeight: fontWeight.semibold,
      minWidth: 48,
      textAlign: 'center',
      padding: 0,
    },
    suffix: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
    },
  });
