import { fontSize, fontWeight, spacing } from '@product/brand';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Glyph, type GlyphName } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';

const CHOICE_RADIUS = 18;
const MARK_SIZE = 40;

interface SheetChoiceProps {
  title: string;
  hint: string;
  glyph?: GlyphName;
  /** Something other than a glyph at the start, such as a crew's faces. */
  leading?: ReactNode;
  isSelected: boolean;
  /** Shown dimmed with its reason rather than hidden, so nobody wonders where it went. */
  isDisabled?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  testID?: string;
}

/** One option in a sheet: a mark, what it is, and a one-line example. */
export function SheetChoice({
  title,
  hint,
  glyph,
  leading,
  isSelected,
  isDisabled = false,
  onPress,
  onLongPress,
  testID,
}: SheetChoiceProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected, disabled: isDisabled }}
      disabled={isDisabled}
      onLongPress={onLongPress}
      onPress={onPress}
      style={[
        styles.choice,
        isSelected ? styles.selected : null,
        isDisabled ? styles.disabled : null,
      ]}
      testID={testID}
    >
      {leading ?? (
        <View style={styles.mark}>
          {glyph ? <Glyph color={colors.text} name={glyph} size={20} strokeWidth={2} /> : null}
        </View>
      )}
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>
    </Pressable>
  );
}

/** A big tile in a two-column grid, such as a length. */
export function SheetTile({
  title,
  hint,
  isSelected,
  isDisabled = false,
  onPress,
  testID,
}: Omit<SheetChoiceProps, 'glyph' | 'leading'>) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={[
        styles.tile,
        isSelected ? styles.selected : null,
        isDisabled ? styles.disabled : null,
      ]}
      testID={testID}
    >
      <Text style={styles.tileTitle}>{title}</Text>
      <Text numberOfLines={1} style={styles.tileHint}>
        {hint}
      </Text>
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    choice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginTop: 10,
      paddingVertical: 14,
      paddingHorizontal: spacing.md,
      borderRadius: CHOICE_RADIUS,
      borderWidth: 2,
      borderColor: 'transparent',
      backgroundColor: theme.colors.surfaceRaised,
    },
    selected: {
      borderColor: theme.colors.text,
    },
    disabled: {
      opacity: 0.45,
    },
    mark: {
      width: MARK_SIZE,
      height: MARK_SIZE,
      borderRadius: 13,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      flex: 1,
    },
    title: {
      color: theme.colors.text,
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
    },
    hint: {
      color: theme.colors.muted,
      fontSize: 13.5,
      lineHeight: 18,
      marginTop: 3,
    },
    tile: {
      flexBasis: '47%',
      flexGrow: 1,
      height: 76,
      justifyContent: 'center',
      gap: 2,
      paddingHorizontal: spacing.md,
      borderRadius: CHOICE_RADIUS,
      borderWidth: 2,
      borderColor: 'transparent',
      backgroundColor: theme.colors.surfaceRaised,
    },
    tileTitle: {
      color: theme.colors.text,
      fontSize: 22,
      fontWeight: fontWeight.semibold,
      letterSpacing: -0.4,
    },
    tileHint: {
      color: theme.colors.muted,
      fontSize: 12.5,
    },
  });
