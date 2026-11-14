import { fontSize, spacing } from '@product/brand';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { type Theme, useTheme, useThemedStyles } from '@/theme';

export type SyncStatusTone = 'syncing' | 'attention' | 'saved';

export type SyncStatusLineProps = {
  tone: SyncStatusTone;
  label: string;
  onPress?: () => void;
  testID?: string;
  /** Drop the top margin when the line sits beside a score. */
  compact?: boolean;
};

/**
 * Quiet status under Today’s tally, beside a board score, or on the success
 * screen. Muted xs text with a small pulsing dot — no new chrome.
 */
export function SyncStatusLine({
  tone,
  label,
  onPress,
  testID = 'sync-status-line',
  compact = false,
}: SyncStatusLineProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (tone !== 'syncing') {
      pulse.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, tone]);

  const dotColor =
    tone === 'attention'
      ? theme.colors.warning
      : tone === 'saved'
        ? theme.colors.primary
        : theme.colors.muted;

  const content = (
    <View style={[styles.row, compact ? styles.compact : null]} testID={testID}>
      <Animated.View
        style={[styles.dot, { backgroundColor: dotColor, opacity: tone === 'syncing' ? pulse : 1 }]}
      />
      <Text style={[styles.label, tone === 'attention' ? styles.attention : null]}>{label}</Text>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      testID={`${testID}-press`}
    >
      {content}
    </Pressable>
  );
}

export function syncingSetsLabel(count: number): string {
  if (count <= 0) {
    return '';
  }
  return count === 1 ? '1 set syncing' : `${count} sets syncing`;
}

export function attentionSetsLabel(count: number): string {
  if (count <= 0) {
    return '';
  }
  return count === 1 ? '1 set needs attention' : `${count} sets need attention`;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    compact: {
      marginTop: 0,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    label: {
      color: theme.colors.muted,
      fontSize: fontSize.xs,
      lineHeight: 16,
    },
    attention: {
      color: theme.colors.text,
    },
  });
