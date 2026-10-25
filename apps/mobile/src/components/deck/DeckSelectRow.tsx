import { fontWeight, spacing } from '@product/brand';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Glyph } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';

const CHECK_SIZE = 22;

interface DeckSelectRowProps {
  title: string;
  meta?: string | null;
  /** Faces or a disc, on the left. */
  leading?: ReactNode;
  isSelected: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  isFirst?: boolean;
  accessibilityHint?: string;
  testID?: string;
}

/** One pickable row of a divider list, for choosing several from a list that grows. */
export function DeckSelectRow({
  title,
  meta = null,
  leading = null,
  isSelected,
  onPress,
  onLongPress,
  isFirst = false,
  accessibilityHint,
  testID,
}: DeckSelectRowProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        isFirst ? null : styles.divider,
        pressed ? styles.pressed : null,
      ]}
      testID={testID}
    >
      {leading}
      <View style={styles.text}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
      <View style={[styles.check, isSelected ? styles.checked : null]}>
        {isSelected ? (
          <Glyph color={colors.onPrimary} name="check" size={14} strokeWidth={3} />
        ) : null}
      </View>
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: spacing.xs,
    },
    divider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    pressed: {
      opacity: 0.7,
    },
    text: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: fontWeight.medium,
    },
    meta: {
      color: theme.colors.muted,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 2,
    },
    check: {
      width: CHECK_SIZE,
      height: CHECK_SIZE,
      borderRadius: CHECK_SIZE / 2,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checked: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary,
    },
  });
