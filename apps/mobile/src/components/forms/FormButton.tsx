import Feather from '@expo/vector-icons/Feather';
import { type BrandColors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import type { FormButtonVariant, IconName } from './types';

interface FormButtonProps {
  label: string;
  onPress: () => void;
  variant?: FormButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  /** A mark before the label, such as a provider logo. */
  leading?: ReactNode;
  /** Something quiet after the label, such as a "Last used" tag. */
  trailing?: ReactNode;
  trailingIcon?: IconName;
  testID?: string;
}

interface VariantColors {
  surface: string;
  pressedSurface: string;
  label: string;
}

function resolveVariantColors(
  colors: BrandColors,
  variant: FormButtonVariant,
  isInactive: boolean,
): VariantColors {
  if (variant === 'secondary') {
    return {
      surface: colors.surface,
      pressedSurface: colors.surfaceRaised,
      label: isInactive ? colors.disabledText : colors.accent,
    };
  }

  if (variant === 'outline') {
    return {
      surface: colors.surface,
      pressedSurface: colors.surfaceRaised,
      label: isInactive ? colors.disabledText : colors.text,
    };
  }

  if (variant === 'danger' && !isInactive) {
    return { surface: colors.danger, pressedSurface: colors.danger, label: colors.onPrimary };
  }

  if (isInactive) {
    return {
      surface: colors.disabledSurface,
      pressedSurface: colors.disabledSurface,
      label: colors.disabledText,
    };
  }

  return {
    surface: colors.primary,
    pressedSurface: colors.primaryPressed,
    label: colors.onPrimary,
  };
}

export function FormButton({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  leading,
  trailing,
  trailingIcon,
  testID,
}: FormButtonProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isInactive = disabled || loading;
  const variantColors = resolveVariantColors(colors, variant, isInactive);

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy: loading }}
      disabled={isInactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'outline' ? styles.outline : null,
        {
          backgroundColor: pressed ? variantColors.pressedSurface : variantColors.surface,
        },
      ]}
      testID={testID}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={variantColors.label} size="small" /> : leading}

        <Text style={[styles.label, { color: variantColors.label }]}>{label}</Text>

        {trailing}

        {trailingIcon && !loading ? (
          <Feather color={variantColors.label} name={trailingIcon} size={18} />
        ) : null}
      </View>
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    button: {
      borderRadius: radii.xl,
      minHeight: 52,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
    },
    /** A hairline keeps a surface-coloured button visible on a white page. */
    outline: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
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
