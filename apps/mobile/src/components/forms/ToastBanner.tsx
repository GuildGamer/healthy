import { colors, fontSize, spacing } from '@product/brand';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  const isAlert = tone === 'error' || tone === 'warning';

  return (
    <Pressable
      accessibilityRole={isAlert ? 'alert' : 'text'}
      onPress={onPress}
      testID={testID}
    >
      <View style={[styles.rule, { backgroundColor: toastRuleColor(tone) }]} />
      <View style={styles.wash}>
        <Text numberOfLines={1} style={styles.message}>
          {message}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rule: {
    height: 2,
  },
  wash: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    backgroundColor: colors.surfaceRaised,
  },
  message: {
    color: colors.text,
    fontSize: fontSize.sm,
  },
});
