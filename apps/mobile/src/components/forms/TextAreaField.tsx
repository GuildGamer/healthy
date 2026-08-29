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
      : colors.border;

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
      style={[styles.input, { borderColor }, style]}
      textAlignVertical="top"
      {...inputProps}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 96,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.text,
    fontSize: fontSize.sm,
  },
});
