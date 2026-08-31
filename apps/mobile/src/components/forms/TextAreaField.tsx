import { colors, fontSize, radii, spacing } from '@product/brand';
import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

type TextAreaFieldProps = TextInputProps & {
  hasError?: boolean;
};

export function TextAreaField({
  hasError = false,
  style,
  onFocus,
  onBlur,
  ...inputProps
}: TextAreaFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const borderColor = hasError
    ? colors.danger
    : isFocused
      ? colors.accent
      : 'transparent';
  const backgroundColor = hasError
    ? colors.surface
    : isFocused
      ? colors.accentSurface
      : colors.surface;

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

const styles = StyleSheet.create({
  input: {
    minHeight: 96,
    borderWidth: 2,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.text,
    fontSize: fontSize.sm,
  },
});
