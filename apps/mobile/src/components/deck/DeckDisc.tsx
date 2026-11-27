import { StyleSheet, View } from 'react-native';
import { Glyph, type GlyphName } from '@/components/icons';
import { type Theme, useTheme, withAlpha } from '@/theme';
import { DECK_KIND_GLYPH } from './deck-kinds';
import type { DeckCardKind } from './types';

const DISC_SIZE = 38;
const GLYPH_SIZE = 18;
const CLINIC_WHITE_TINT = 0.13;

interface DeckDiscProps {
  /** A challenge's kind, drawn in its own colour; omit for a plain grey disc. */
  kind?: DeckCardKind | null;
  /** Overrides the kind's own glyph, such as a camera for its photo check. */
  glyph?: GlyphName;
}

function discFill(theme: Theme, kind: DeckCardKind | null): string {
  if (!kind) {
    return theme.colors.surfaceRaised;
  }

  const tone = theme.deckCards.tones[kind];
  return theme.deckCards.hasToneRail ? withAlpha(tone, CLINIC_WHITE_TINT) : theme.deckCards[kind];
}

/** The soft circle a row's mark sits in. */
export function DeckDisc({ kind = null, glyph }: DeckDiscProps) {
  const theme = useTheme();
  const name = glyph ?? (kind ? DECK_KIND_GLYPH[kind] : 'check');
  const color = kind ? theme.deckCards.tones[kind] : theme.colors.text;

  return (
    <View style={[styles.disc, { backgroundColor: discFill(theme, kind) }]}>
      <Glyph color={color} name={name} size={GLYPH_SIZE} strokeWidth={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    width: DISC_SIZE,
    height: DISC_SIZE,
    borderRadius: DISC_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
