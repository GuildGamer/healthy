import { fontSize, spacing } from '@product/brand';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { toastRuleColor } from './toast-tone';
import type { ToastTone } from './types';

interface ToastBannerProps {
  message: string;
  tone?: ToastTone;
  onPress?: () => void;
  testID?: string;
}

export function ToastBanner({
  message,
  tone = 'error',
  onPress,
  testID = 'toast-banner',
}: ToastBannerProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isAlert = tone === 'error' || tone === 'warning';

  return (
    <Pressable accessibilityRole={isAlert ? 'alert' : 'text'} onPress={onPress} testID={testID}>
      <View style={[styles.rule, { backgroundColor: toastRuleColor(tone, colors) }]} />
      <View style={styles.wash}>
        <Text numberOfLines={1} style={styles.message}>
          {message}
        </Text>
      </View>
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    rule: {
      height: 2,
    },
    wash: {
      minHeight: 32,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: 7,
      backgroundColor: theme.colors.surfaceRaised,
    },
    message: {
      color: theme.colors.text,
      fontSize: fontSize.sm,
    },
  });
