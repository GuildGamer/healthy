import { spacing } from '@product/brand';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Glyph } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';

interface CreateSettingRowProps {
  label: string;
  value: string;
  /** Omit when there is only one option, so the row reads as a fact rather than a choice. */
  onPress?: () => void;
  isFirst?: boolean;
  testID?: string;
}

/** One row under the live invite: what it sets, its value, and a way to change it. */
export function CreateSettingRow({
  label,
  value,
  onPress,
  isFirst = false,
  testID,
}: CreateSettingRowProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityHint={onPress ? `Changes ${label.toLowerCase()}` : undefined}
      accessibilityRole={onPress ? 'button' : 'text'}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        isFirst ? null : styles.divided,
        pressed ? styles.pressed : null,
      ]}
      testID={testID}
    >
      <Text style={styles.label}>{label}</Text>
      <View style={styles.value}>
        <Text numberOfLines={1} style={styles.valueText}>
          {value}
        </Text>
        {onPress ? <Glyph color={colors.muted} name="forward" size={16} strokeWidth={2} /> : null}
      </View>
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingVertical: 14,
      paddingHorizontal: spacing.xs,
    },
    divided: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    pressed: {
      opacity: 0.7,
    },
    label: {
      color: theme.colors.text,
      fontSize: 15,
    },
    value: {
      flexShrink: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    valueText: {
      flexShrink: 1,
      color: theme.colors.muted,
      fontSize: 15,
    },
  });
