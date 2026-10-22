import { fontWeight, palettes, radii, spacing } from '@product/brand';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import { useCardActs } from './CardActsProvider';

/** The toast sits in the other scheme's colours, so it reads as apart from the deck. */
export function CardToastBar() {
  const { scheme } = useTheme();
  const { toast, dismissToast } = useCardActs();
  const inverse = palettes[scheme === 'dark' ? 'light' : 'dark'];

  if (!toast) {
    return null;
  }

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.toast, { backgroundColor: inverse.background }]}
      testID="home-card-toast"
    >
      <Pressable accessibilityRole="button" onPress={dismissToast} style={styles.message}>
        <Text numberOfLines={1} style={[styles.text, { color: inverse.text }]}>
          {toast.message}
        </Text>
      </Pressable>
      {toast.action ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={toast.action.onPress}
          testID="home-card-toast-action"
        >
          <Text style={[styles.action, { color: inverse.accent }]}>{toast.action.label}</Text>
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
    bottom: spacing.md,
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
