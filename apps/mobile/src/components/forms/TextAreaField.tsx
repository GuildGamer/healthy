import type { BrandColors } from '@product/brand';
import { fontSize, radii, spacing } from '@product/brand';
import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { type Theme, useTheme, useThemedStyles } from '@/theme';

type TextAreaFieldProps = TextInputProps & {
  hasError?: boolean;
};

function borderFor(colors: BrandColors, hasError: boolean, isFocused: boolean): string {
  if (hasError) {
    return colors.danger;
  }

  if (isFocused) {
    return colors.accent;
  }

  return 'transparent';
}

function fillFor(colors: BrandColors, hasError: boolean, isFocused: boolean): string {
  if (isFocused && !hasError) {
    return colors.accentSurface;
  }

  return colors.surface;
}

export function TextAreaField({
  hasError = false,
  style,
  onFocus,
  onBlur,
  ...inputProps
}: TextAreaFieldProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [isFocused, setIsFocused] = useState(false);
  const borderColor = borderFor(colors, hasError, isFocused);
  const backgroundColor = fillFor(colors, hasError, isFocused);

  return (
    <TextInput
      multiline
      onBlur={(event) => {
        setIsFocused(false);
        onBlur?.(event);
      }}
      onFocus={(event) => {
        setIsFocused(true);
        onFocus?.(event);
      }}
      placeholderTextColor={colors.disabledText}
      style={[styles.input, { backgroundColor, borderColor }, style]}
      textAlignVertical="top"
      {...inputProps}
    />
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    input: {
      minHeight: 96,
      borderWidth: 2,
      borderRadius: radii.xl,
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
      color: theme.colors.text,
      fontSize: fontSize.sm,
    },
  });
