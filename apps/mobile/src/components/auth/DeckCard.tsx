import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { Glyph } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import type { DeckCardContent } from './constants/welcome-deck';
import { deckCardTone } from './deck-card-tone';

export const DECK_CARD_HEIGHT = 226;
const TONE_RAIL_HEIGHT = 6;

/** One card as Today deals it: what it is, when, the challenge, and how it's proved. */
export function DeckCard({ card }: { card: DeckCardContent }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { deckCards } = theme;

  return (
    <View style={[styles.card, { backgroundColor: deckCards[card.kind] }]}>
      {deckCards.hasToneRail ? (
        <View style={[styles.rail, { backgroundColor: deckCardTone(theme, card.kind) }]} />
      ) : null}
      <View style={styles.eyebrow}>
        <View style={styles.eyebrowLabel}>
          <Glyph color={deckCards.subtext} name={card.categoryGlyph} size={16} />
          <Text style={styles.subtext}>{card.category}</Text>
        </View>
        <Text style={styles.subtext}>{card.when}</Text>
      </View>
      <Text style={styles.title}>{card.title}</Text>
      <View style={styles.proof}>
        <Glyph color={deckCards.subtext} name={card.proofGlyph} size={16} />
        <Text style={styles.subtext}>{card.proof}</Text>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      height: DECK_CARD_HEIGHT,
      borderRadius: radii.xl,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      overflow: 'hidden',
      borderWidth: theme.deckCards.hasToneRail ? StyleSheet.hairlineWidth : 0,
      borderColor: theme.colors.border,
    },
    rail: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: TONE_RAIL_HEIGHT,
    },
    eyebrow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    eyebrowLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    subtext: {
      color: theme.deckCards.subtext,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
    },
    title: {
      color: theme.deckCards.text,
      fontSize: fontSize.xl,
      fontWeight: fontWeight.semibold,
      letterSpacing: -0.6,
      lineHeight: fontSize.xl * 1.1,
      marginTop: spacing.md,
      maxWidth: 250,
    },
    proof: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: 'auto',
    },
  });
