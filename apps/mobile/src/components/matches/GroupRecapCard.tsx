import type { MatchBoard } from '@product/client';
import { fontSize, fontWeight, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import {
  SHARE_POSTER_HEIGHT,
  SHARE_POSTER_WIDTH,
} from '@/components/challenges/SharePosterCard';
import { SHARE_COPY } from '@/components/challenges/constants/doing-copy';
import { posterValueMetrics } from '@/components/challenges/share-poster';
import { useTheme } from '@/theme';
import { groupRecapContent } from './group-recap';
import { groupToneFor } from './group-tone';

/** Drawn at this width and exported at 1080, so the type scale is fixed, not fitted. */
export const GROUP_RECAP_CARD_WIDTH = SHARE_POSTER_WIDTH;

/**
 * A finished group as a deck poster: your place (or score) as one numeral,
 * hairline brand row. Same family as `SharePosterCard`, filled with the
 * group's activity (or streak) colour.
 */
export function GroupRecapCard({ board }: { board: MatchBoard }) {
  const theme = useTheme();
  const content = groupRecapContent(board);
  const tone = groupToneFor(theme, board);
  const valueMetrics = posterValueMetrics(content.hero.value);
  const brandMeta = content.facts[0]?.value ?? content.length;
  const ink = {
    text: theme.deckCards.text,
    subtext: theme.deckCards.subtext,
    track: theme.deckCards.track,
  };

  return (
    <View style={[styles.poster, { backgroundColor: tone.fill }]} testID="match-recap-card">
      <View style={styles.top}>
        <Text style={[styles.label, { color: ink.subtext }]}>{content.kind}</Text>
        <Text style={[styles.label, { color: ink.subtext }]}>{content.length}</Text>
      </View>
      <Text
        adjustsFontSizeToFit
        numberOfLines={1}
        style={[styles.value, { color: ink.text }, valueMetrics]}
      >
        {content.hero.value}
      </Text>
      <Text style={[styles.unit, { color: ink.subtext }]}>{content.hero.unit}</Text>
      <View style={[styles.brand, { borderTopColor: ink.track }]}>
        <Text style={[styles.brandName, { color: ink.text }]}>{SHARE_COPY.brand}</Text>
        <Text style={[styles.label, { color: ink.subtext }]}>{brandMeta}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  poster: {
    width: SHARE_POSTER_WIDTH,
    height: SHARE_POSTER_HEIGHT,
    borderRadius: 26,
    padding: 22,
    overflow: 'hidden',
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  value: {
    fontWeight: fontWeight.semibold,
    marginTop: 'auto',
  },
  unit: {
    fontSize: 17,
    marginTop: spacing.sm,
  },
  brand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  brandName: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
  },
});
