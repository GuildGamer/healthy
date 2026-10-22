import { radii } from '@product/brand';
import { Pressable, StyleSheet } from 'react-native';
import { Glyph, type GlyphName } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';

const ROUND_BUTTON_SIZE = 54;

interface DeckRoundButtonProps {
  glyph: GlyphName;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  /** Sits on a sheet rather than on a card. */
  onSurface?: boolean;
  testID?: string;
}

/** A square icon button beside a card's main action, such as − or pause. */
export function DeckRoundButton({
  glyph,
  accessibilityLabel,
  onPress,
  disabled = false,
  onSurface = false,
  testID,
}: DeckRoundButtonProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const color = onSurface ? theme.colors.text : theme.deckCards.text;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        onSurface ? styles.onSurface : null,
        { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}
      testID={testID}
    >
      <Glyph color={color} name={glyph} size={22} strokeWidth={2.2} />
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    button: {
      width: ROUND_BUTTON_SIZE,
      height: ROUND_BUTTON_SIZE,
      borderRadius: radii.lg,
      backgroundColor: theme.deckCards.track,
      alignItems: 'center',
      justifyContent: 'center',
    },
    onSurface: {
      backgroundColor: theme.colors.surfaceRaised,
    },
  });
