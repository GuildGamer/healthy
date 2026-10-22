import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Glyph, type GlyphName } from '@/components/icons';
import { type Theme, useTheme } from '@/theme';
import type { DeckButtonVariant } from './types';

const DECK_BUTTON_HEIGHT = 54;

interface DeckButtonProps {
  label: string;
  onPress: () => void;
  variant?: DeckButtonVariant;
  glyph?: GlyphName;
  loading?: boolean;
  disabled?: boolean;
  /** Shares a row with another button. */
  isFlexible?: boolean;
  testID?: string;
}

type ButtonPaint = { fill: string; label: string };

function paintFor(theme: Theme, variant: DeckButtonVariant, isInactive: boolean): ButtonPaint {
  if (variant === 'tonal') {
    return { fill: theme.deckCards.track, label: theme.deckCards.text };
  }

  if (variant === 'quiet') {
    return { fill: 'transparent', label: theme.deckCards.subtext };
  }

  if (variant === 'cameraSolid') {
    return { fill: theme.camera.solid, label: theme.camera.onSolid };
  }

  if (variant === 'cameraGlass') {
    return { fill: theme.camera.glass, label: theme.camera.text };
  }

  if (isInactive) {
    return { fill: theme.colors.disabledSurface, label: theme.colors.disabledText };
  }

  return { fill: theme.colors.primary, label: theme.colors.onPrimary };
}

/** A deck control: the card's own button, a sheet's save, or a camera's choice. */
export function DeckButton({
  label,
  onPress,
  variant = 'primary',
  glyph,
  loading = false,
  disabled = false,
  isFlexible = false,
  testID,
}: DeckButtonProps) {
  const theme = useTheme();
  const isInactive = disabled || loading;
  const paint = paintFor(theme, variant, isInactive);

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy: loading }}
      disabled={isInactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'quiet' ? styles.quiet : null,
        isFlexible ? styles.flexible : null,
        { backgroundColor: paint.fill, opacity: pressed ? 0.8 : 1 },
      ]}
      testID={testID}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={paint.label} size="small" /> : null}
        {glyph && !loading ? <Glyph color={paint.label} name={glyph} size={18} /> : null}
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            variant === 'quiet' ? styles.quietLabel : null,
            { color: paint.label },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: DECK_BUTTON_HEIGHT,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  quiet: {
    height: 44,
  },
  flexible: {
    flex: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    letterSpacing: -0.2,
  },
  quietLabel: {
    fontSize: 15,
    fontWeight: fontWeight.medium,
  },
});
