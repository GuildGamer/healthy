import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { FormButtonVariant, IconName } from './types';

interface FormButtonProps {
  label: string;
  onPress: () => void;
  variant?: FormButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  trailingIcon?: IconName;
  testID?: string;
}

interface VariantColors {
  surface: string;
  pressedSurface: string;
  label: string;
}

function resolveVariantColors(variant: FormButtonVariant, isInactive: boolean): VariantColors {
  if (variant === 'secondary') {
    return {
      surface: colors.surface,
      pressedSurface: colors.surfaceRaised,
      label: isInactive ? colors.disabledText : colors.accent,
    };
  }

  if (isInactive) {
    return {
      surface: colors.disabledSurface,
      pressedSurface: colors.disabledSurface,
      label: colors.disabledText,
    };
  }

  return {
    surface: colors.accent,
    pressedSurface: colors.accentPressed,
    label: colors.onAccent,
  };
}

export function FormButton({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  trailingIcon,
  testID,
}: FormButtonProps) {
  const isInactive = disabled || loading;
  const variantColors = resolveVariantColors(variant, isInactive);

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy: loading }}
      disabled={isInactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed
            ? variantColors.pressedSurface
            : variantColors.surface,
        },
      ]}
      testID={testID}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={variantColors.label} size="small" /> : null}

        <Text style={[styles.label, { color: variantColors.label }]}>{label}</Text>

        {trailingIcon && !loading ? (
          <Feather color={variantColors.label} name={trailingIcon} size={18} />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radii.xl,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
