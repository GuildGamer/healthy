import { fontSize, fontWeight, spacing } from '@product/brand';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Glyph } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';

interface DeckListRowProps {
  title: string;
  meta?: ReactNode;
  /** A disc or a rank, on the left. */
  leading?: ReactNode;
  /** An amount or a time, on the right. */
  trailing?: ReactNode;
  /** Opens somewhere; the row then carries a chevron. */
  onPress?: () => void;
  isFirst?: boolean;
  /** Pins the leading mark to the first line, for rows whose meta wraps. */
  isTopAligned?: boolean;
  accessibilityHint?: string;
  testID?: string;
}

/** One row of a divider list on the plain page. */
export function DeckListRow({
  title,
  meta = null,
  leading = null,
  trailing = null,
  onPress,
  isFirst = false,
  isTopAligned = false,
  accessibilityHint,
  testID,
}: DeckListRowProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const rowStyle = [
    styles.row,
    isFirst ? null : styles.divider,
    isTopAligned ? styles.topAligned : null,
  ];
  const content = (
    <>
      {leading}
      <View style={styles.text}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {typeof meta === 'string' ? <Text style={styles.meta}>{meta}</Text> : meta}
      </View>
      {trailing}
      {onPress ? <Glyph color={colors.muted} name="forward" size={16} strokeWidth={2} /> : null}
    </>
  );

  if (!onPress) {
    return (
      <View style={rowStyle} testID={testID}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
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
    topAligned: {
      alignItems: 'flex-start',
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
    amount: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: fontWeight.semibold,
      textAlign: 'right',
    },
    loss: {
      color: theme.colors.danger,
    },
    quiet: {
      color: theme.colors.muted,
      fontWeight: fontWeight.medium,
    },
    lossNote: {
      color: theme.colors.danger,
      fontSize: fontSize.xs,
      textAlign: 'right',
      marginTop: 2,
    },
  });

type AmountTone = 'plain' | 'loss' | 'quiet';

/** A row's figure on the right, with an optional red note under it. */
export function DeckRowAmount({
  text,
  tone = 'plain',
  lossNote = null,
}: {
  text: string;
  tone?: AmountTone;
  lossNote?: string | null;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View>
      <Text
        style={[
          styles.amount,
          tone === 'loss' ? styles.loss : null,
          tone === 'quiet' ? styles.quiet : null,
        ]}
      >
        {text}
      </Text>
      {lossNote ? <Text style={styles.lossNote}>{lossNote}</Text> : null}
    </View>
  );
}
