import { fontWeight, palettes, radii, spacing } from '@product/brand';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';

interface DeckToastProps {
  message: string;
  action?: { label: string; onPress: () => void } | null;
  onDismiss: () => void;
  testID?: string;
}

/** A line at the foot of the screen in the other scheme's colours, so it reads as apart from the page. */
export function DeckToast({ message, action = null, onDismiss, testID }: DeckToastProps) {
  const { scheme } = useTheme();
  const inverse = palettes[scheme === 'dark' ? 'light' : 'dark'];

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.toast, { backgroundColor: inverse.background }]}
      testID={testID}
    >
      <Pressable accessibilityRole="button" onPress={onDismiss} style={styles.message}>
        <Text numberOfLines={1} style={[styles.text, { color: inverse.text }]}>
          {message}
        </Text>
      </Pressable>
      {action ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={action.onPress}
          testID={testID ? `${testID}-action` : undefined}
        >
          <Text style={[styles.action, { color: inverse.accent }]}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: spacing.lg,
    height: 50,
    borderRadius: radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    gap: spacing.md,
  },
  message: {
    flex: 1,
  },
  text: {
    fontSize: 14.5,
  },
  action: {
    fontSize: 14.5,
    fontWeight: fontWeight.semibold,
  },
});
