import type { MatchBoard } from '@product/client';
import { fontSize, fontWeight, spacing } from '@product/brand';
import { StyleSheet, View } from 'react-native';
import {
  SHARE_POSTER_HEIGHT,
  SHARE_POSTER_PADDING,
  SHARE_POSTER_RADIUS,
  SHARE_POSTER_WIDTH,
} from '@/components/challenges/SharePosterCard';
import { SHARE_COPY } from '@/components/challenges/constants/doing-copy';
import { posterValueMetrics } from '@/components/challenges/share-poster';
import { SharePosterText } from '@/components/challenges/SharePosterText';
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
    <View style={styles.shell} testID="match-recap-card">
      <View style={[styles.fill, { backgroundColor: tone.fill }]} />
      <View style={styles.type}>
        <View style={styles.top}>
          <SharePosterText style={[styles.label, { color: ink.subtext }]}>
            {content.kind}
          </SharePosterText>
          <SharePosterText style={[styles.label, { color: ink.subtext }]}>
            {content.length}
          </SharePosterText>
        </View>
        <SharePosterText
          adjustsFontSizeToFit
          numberOfLines={1}
          style={[styles.value, { color: ink.text }, valueMetrics]}
        >
          {content.hero.value}
        </SharePosterText>
        <SharePosterText style={[styles.unit, { color: ink.subtext }]}>
          {content.hero.unit}
        </SharePosterText>
        <View style={[styles.brand, { borderTopColor: ink.track }]}>
          <SharePosterText style={[styles.brandName, { color: ink.text }]}>
            {SHARE_COPY.brand}
          </SharePosterText>
          <SharePosterText style={[styles.label, { color: ink.subtext }]}>
            {brandMeta}
          </SharePosterText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: SHARE_POSTER_WIDTH,
    height: SHARE_POSTER_HEIGHT,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: SHARE_POSTER_RADIUS,
    overflow: 'hidden',
  },
  type: {
    flex: 1,
    padding: SHARE_POSTER_PADDING,
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
