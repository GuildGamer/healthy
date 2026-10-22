import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { forwardRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { type Theme, useTheme, useThemedStyles } from '@/theme';

/** The ring sits inside the box, so padding gives back its width. */
const FIELD_RING_WIDTH = 2;

interface InsetFieldSide {
  label: string;
  onPress: () => void;
  testID?: string;
}

export interface InsetFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  /** Short text on the right of the label row, such as `1 of 24`. */
  counter?: string;
  /** A text action at the end of the input, such as Show or Hide. */
  side?: InsetFieldSide;
  hasError?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * A field with its label inside the box: the calm screens' text input. The
 * ring is the only state colour, ink while typing and red when invalid.
 */
export const InsetField = forwardRef<TextInput, InsetFieldProps>(function InsetField(
  { label, counter, side, hasError = false, containerStyle, onFocus, onBlur, ...inputProps },
  ref,
) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View
      style={[
        styles.field,
        isFocused ? styles.focused : null,
        hasError ? styles.invalid : null,
        containerStyle,
      ]}
    >
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {counter ? <Text style={styles.label}>{counter}</Text> : null}
      </View>
      <View style={styles.inputRow}>
        <TextInput
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          onFocus={(event) => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          placeholderTextColor={colors.disabledText}
          ref={ref}
          selectionColor={colors.accent}
          style={styles.input}
          {...inputProps}
        />
        {side ? <InsetFieldSideAction side={side} /> : null}
      </View>
    </View>
  );
});

/** The same box as `InsetField`, for a value chosen elsewhere (a sheet). */
export function InsetSelectField({
  label,
  value,
  side,
  containerStyle,
}: {
  label: string;
  value: string;
  side: InsetFieldSide;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityLabel={`${label}: ${value}. ${side.label}`}
      accessibilityRole="button"
      onPress={side.onPress}
      style={[styles.field, containerStyle]}
      testID={side.testID}
    >
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <Text numberOfLines={1} style={[styles.input, styles.value]}>
          {value}
        </Text>
        <Text style={styles.sideLabel}>{side.label}</Text>
      </View>
    </Pressable>
  );
}

function InsetFieldSideAction({ side }: { side: InsetFieldSide }) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable accessibilityRole="button" hitSlop={12} onPress={side.onPress} testID={side.testID}>
      <Text style={styles.sideLabel}>{side.label}</Text>
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    field: {
      backgroundColor: theme.colors.surface,
      borderRadius: radii.lg,
      borderWidth: FIELD_RING_WIDTH,
      borderColor: 'transparent',
      paddingHorizontal: spacing.md - FIELD_RING_WIDTH,
      paddingVertical: spacing.sm,
    },
    focused: {
      borderColor: theme.colors.text,
    },
    invalid: {
      borderColor: theme.colors.danger,
    },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    label: {
      color: theme.colors.muted,
      fontSize: fontSize.xs,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    input: {
      flex: 1,
      color: theme.colors.text,
      fontSize: fontSize.md,
      paddingVertical: 3,
    },
    value: {
      paddingVertical: 4,
    },
    sideLabel: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
    },
  });
