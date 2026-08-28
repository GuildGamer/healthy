import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, radii, spacing } from '@product/brand';
import { forwardRef, useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import type { IconName } from './types';

interface TextFieldProps extends TextInputProps {
  leadingIcon?: IconName;
  trailing?: ReactNode;
  hasError?: boolean;
}

function resolveBorderColor(hasError: boolean, isFocused: boolean): string {
  if (hasError) return colors.danger;
  if (isFocused) return colors.accent;
  return colors.border;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { leadingIcon, trailing, hasError = false, style, onFocus, onBlur, ...inputProps },
  ref,
) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View
      style={[styles.container, { borderColor: resolveBorderColor(hasError, isFocused) }]}
    >
      {leadingIcon ? (
        <Feather
          color={colors.muted}
          name={leadingIcon}
          size={20}
          style={styles.leadingIcon}
        />
      ) : null}

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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  leadingIcon: {
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
