import Feather from '@expo/vector-icons/Feather';
import { fontSize, radii, spacing } from '@product/brand';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type Theme, useTheme, useThemedStyles } from '@/theme';

interface OptionCardProps {
  selected: boolean;
  onPress: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
  testID?: string;
}

export function OptionCard({
  selected,
  onPress,
  title,
  description,
  icon,
  disabled = false,
  testID,
}: OptionCardProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.card,
        selected ? styles.cardSelected : styles.cardUnselected,
        disabled ? styles.cardDisabled : null,
      ]}
      testID={testID}
    >
      {icon}

      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>

      <View style={[styles.check, selected ? styles.checkSelected : styles.checkUnselected]}>
        {selected ? <Feather color={colors.onAccent} name="check" size={14} /> : null}
      </View>
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 2,
    },
    cardSelected: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accentSurface,
    },
    cardUnselected: {
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    cardDisabled: {
      opacity: 0.5,
    },
    body: {
      flex: 1,
    },
    title: {
      color: theme.colors.text,
      fontSize: fontSize.md,
    },
    description: {
      color: theme.colors.muted,
      fontSize: fontSize.xs,
      marginTop: 2,
    },
    check: {
      width: 24,
      height: 24,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkSelected: {
      backgroundColor: theme.colors.accent,
    },
    checkUnselected: {
      borderWidth: 2,
      borderColor: theme.colors.border,
    },
  });
