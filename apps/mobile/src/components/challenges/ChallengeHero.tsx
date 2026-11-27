import type { CatalogChallenge } from '@product/client';
import { fontWeight, spacing } from '@product/brand';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DeckEyebrow } from '@/components/deck';
import { Glyph, type GlyphName } from '@/components/icons';
import { healthCategoryName } from '@/constants/health-categories';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { useChallengeTone } from './useChallengeTone';

const HERO_RADIUS = 24;
const HERO_RAIL_HEIGHT = 5;

type HeroChallenge = Pick<CatalogChallenge, 'category' | 'completionKind' | 'capture'>;

interface ChallengeHeroProps {
  challenge: HeroChallenge;
  title: string;
  /** Quiet text in the corner, such as "+150 a day". */
  corner: string;
  /** How it is proved, such as "Counted by your camera". */
  proof?: { glyph: GlyphName; line: string } | null;
  children?: ReactNode;
  testID?: string;
}

/** A challenge's own card at the top of a sheet or a page, in the colour it has on Today. */
export function ChallengeHero({
  challenge,
  title,
  corner,
  proof = null,
  children,
  testID,
}: ChallengeHeroProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { tone, fill, glyph } = useChallengeTone(challenge);
  const hasRail = theme.deckCards.hasToneRail;

  return (
    <View style={[styles.hero, { backgroundColor: fill }]} testID={testID}>
      {hasRail ? <View style={[styles.rail, { backgroundColor: tone }]} /> : null}
      <DeckEyebrow
        corner={corner}
        glyph={glyph}
        label={healthCategoryName(challenge.category)}
        labelColor={hasRail ? tone : undefined}
      />
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {proof ? (
        <View style={styles.proof}>
          <Glyph color={theme.deckCards.subtext} name={proof.glyph} size={15} />
          <Text style={styles.proofLine}>{proof.line}</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    hero: {
      borderRadius: HERO_RADIUS,
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
      height: HERO_RAIL_HEIGHT,
    },
    title: {
      color: theme.deckCards.text,
      fontSize: 28,
      fontWeight: fontWeight.semibold,
      letterSpacing: -0.6,
      lineHeight: 32,
      marginTop: 12,
    },
    proof: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginTop: spacing.sm,
    },
    proofLine: {
      flexShrink: 1,
      color: theme.deckCards.subtext,
      fontSize: 13.5,
    },
  });
