import { Pressable, StyleSheet } from 'react-native';
import { Glyph, type GlyphName } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';

const NAV_BUTTON_SIZE = 40;

interface DeckNavButtonProps {
  glyph: GlyphName;
  accessibilityLabel: string;
  onPress: () => void;
  /** Floats over a live camera rather than sitting on a card's colour. */
  overCamera?: boolean;
  /** Sits on the plain page, at the top of a list or a settings screen. */
  onPage?: boolean;
  testID?: string;
}

/** The round way out at the top of a full-phone session, or of a page. */
export function DeckNavButton({
  glyph,
  accessibilityLabel,
  onPress,
  overCamera = false,
  onPage = false,
  testID,
}: DeckNavButtonProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={[styles.button, overCamera ? styles.overCamera : null, onPage ? styles.onPage : null]}
      testID={testID}
    >
      <Glyph
        color={overCamera ? theme.camera.text : onPage ? theme.colors.text : theme.deckCards.text}
        name={glyph}
        size={20}
        strokeWidth={2.2}
      />
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    button: {
      width: NAV_BUTTON_SIZE,
      height: NAV_BUTTON_SIZE,
      borderRadius: NAV_BUTTON_SIZE / 2,
      backgroundColor: theme.deckCards.track,
      alignItems: 'center',
      justifyContent: 'center',
    },
    overCamera: {
      backgroundColor: theme.camera.pill,
    },
    onPage: {
      backgroundColor: theme.colors.surface,
    },
  });
