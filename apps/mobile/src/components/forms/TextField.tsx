import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, radii, spacing } from '@product/brand';
import { forwardRef, useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import type { IconName } from './types';

interface TextFieldProps extends TextInputProps {
  /** Prefer `leading` (e.g. FieldMark) for branded screens. */
  leading?: ReactNode;
  /** Legacy Feather name — used only when `leading` is omitted. */
  leadingIcon?: IconName;
  trailing?: ReactNode;
  hasError?: boolean;
}

function resolveBorderColor(hasError: boolean, isFocused: boolean): string {
  if (hasError) return colors.danger;
  if (isFocused) return colors.accent;
  return 'transparent';
}

function resolveFill(hasError: boolean, isFocused: boolean): string {
  if (hasError) return colors.surface;
  if (isFocused) return colors.accentSurface;
  return colors.surface;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  {
    leading,
    leadingIcon,
    trailing,
    hasError = false,
    style,
    onFocus,
    onBlur,
    ...inputProps
  },
  ref,
) {
  const [isFocused, setIsFocused] = useState(false);
  const leadingContent =
    leading ??
    (leadingIcon ? (
      <Feather
        color={colors.muted}
        name={leadingIcon}
        size={20}
        style={styles.legacyIcon}
      />
    ) : null);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: resolveFill(hasError, isFocused),
          borderColor: resolveBorderColor(hasError, isFocused),
        },
      ]}
    >
      {leadingContent}

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
        style={[styles.input, style]}
        {...inputProps}
      />

      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  legacyIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    paddingVertical: 14,
  },
  trailing: {
    marginLeft: spacing.sm,
  },
});
