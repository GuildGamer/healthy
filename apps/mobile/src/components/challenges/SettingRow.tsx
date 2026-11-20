import { fontWeight, radii, spacing } from '@product/brand';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Glyph, type GlyphName } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';

interface SettingRowProps {
  label: string;
  /** A mark before the label, such as the bell on a reminder. */
  glyph?: GlyphName | null;
  value?: string | null;
  /** A small chip after the value, such as "Members". */
  tag?: string | null;
  /** A control in place of the value, such as how-often's segments. */
  control?: ReactNode;
  onPress?: () => void;
  /** A mark at the end of the row that does its own thing, such as × to remove. */
  trailing?: { glyph: GlyphName; accessibilityLabel: string; onPress: () => void; testID?: string };
  isMuted?: boolean;
  isFirst?: boolean;
  testID?: string;
}

/** One line of a settings list: what it is on the left, what it is set to on the right. */
export function SettingRow({
  label,
  glyph = null,
  value = null,
  tag = null,
  control = null,
  onPress,
  trailing,
  isMuted = false,
  isFirst = false,
  testID,
}: SettingRowProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const labelColor = isMuted ? colors.muted : colors.text;

  const content = (
    <>
      <View style={styles.label}>
        {glyph ? <Glyph color={labelColor} name={glyph} size={15} strokeWidth={2} /> : null}
        <Text numberOfLines={1} style={[styles.labelText, { color: labelColor }]}>
          {label}
        </Text>
      </View>
      {control}
      <View style={styles.value}>
        {value ? <Text style={styles.valueText}>{value}</Text> : null}
        {tag ? <Text style={styles.tag}>{tag.toUpperCase()}</Text> : null}
        {onPress && !trailing ? (
          <Glyph color={colors.muted} name="forward" size={16} strokeWidth={2} />
        ) : null}
        {trailing ? (
          <Pressable
            accessibilityLabel={trailing.accessibilityLabel}
            accessibilityRole="button"
            hitSlop={10}
            onPress={trailing.onPress}
            testID={trailing.testID}
          >
            <Glyph color={colors.muted} name={trailing.glyph} size={16} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>
    </>
  );

  const rowStyle = [styles.row, isFirst ? null : styles.divider];
  if (!onPress) {
    return (
      <View style={rowStyle} testID={testID}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [...rowStyle, pressed ? styles.pressed : null]}
      testID={testID}
    >
      {content}
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      minHeight: 50,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingVertical: 13,
    },
    divider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    pressed: {
      opacity: 0.7,
    },
    label: {
      flexShrink: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    labelText: {
      flexShrink: 1,
      fontSize: 15,
    },
    value: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    valueText: {
      color: theme.colors.muted,
      fontSize: 15,
    },
    tag: {
      color: theme.colors.muted,
      backgroundColor: theme.colors.surfaceRaised,
      borderRadius: radii.sm - 2,
      overflow: 'hidden',
      paddingHorizontal: 6,
      paddingVertical: 2,
      fontSize: 10.5,
      fontWeight: fontWeight.semibold,
      letterSpacing: 0.5,
    },
  });
