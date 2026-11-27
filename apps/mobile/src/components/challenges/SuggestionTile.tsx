import type { CatalogChallenge } from '@product/client';
import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DeckEyebrow } from '@/components/deck';
import { Glyph } from '@/components/icons';
import { healthCategoryName } from '@/constants/health-categories';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { challengeProof } from './challenge-proof';
import { CATALOG_COPY } from './constants/routine-copy';
import { useChallengeTone } from './useChallengeTone';

const TILE_WIDTH = 200;
const TILE_HEIGHT = 210;
const TILE_RADIUS = 24;

/** A suggested challenge as a small card in its own colour; tapping it opens the preview. */
export function SuggestionTile({
  challenge,
  onPress,
}: {
  challenge: CatalogChallenge;
  onPress: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { tone, fill, glyph } = useChallengeTone(challenge);
  const hasRail = theme.deckCards.hasToneRail;

  return (
    <Pressable
      accessibilityHint="Shows how it works before adding it"
      accessibilityLabel={`${CATALOG_COPY.tileAdd} ${challenge.title}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tile, { backgroundColor: fill, opacity: pressed ? 0.85 : 1 }]}
      testID={`catalog-suggestion-${challenge.challengeId}`}
    >
      {hasRail ? <View style={[styles.rail, { backgroundColor: tone }]} /> : null}
      <DeckEyebrow
        glyph={glyph}
        label={healthCategoryName(challenge.category)}
        labelColor={hasRail ? tone : undefined}
      />
      <Text numberOfLines={3} style={styles.title}>
        {challenge.title}
      </Text>
      <Text numberOfLines={1} style={styles.meta}>
        {challengeProof(challenge).short}
      </Text>
      <View style={styles.add}>
        <Glyph color={theme.deckCards.text} name="plus" size={15} strokeWidth={2.4} />
        <Text style={styles.addLabel}>{CATALOG_COPY.tileAdd}</Text>
      </View>
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    tile: {
      width: TILE_WIDTH,
      height: TILE_HEIGHT,
      borderRadius: TILE_RADIUS,
      padding: 18,
      overflow: 'hidden',
      borderWidth: theme.deckCards.hasToneRail ? StyleSheet.hairlineWidth : 0,
      borderColor: theme.colors.border,
    },
    rail: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 5,
    },
    title: {
      color: theme.deckCards.text,
      fontSize: 23,
      fontWeight: fontWeight.semibold,
      letterSpacing: -0.5,
      lineHeight: 26,
      marginTop: 12,
    },
    meta: {
      marginTop: 'auto',
      color: theme.deckCards.subtext,
      fontSize: 13,
    },
    add: {
      height: 36,
      marginTop: 10,
      borderRadius: radii.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs + 2,
      backgroundColor: theme.deckCards.track,
    },
    addLabel: {
      color: theme.deckCards.text,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
    },
  });
