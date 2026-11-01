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
import { TODAY_COPY } from './constants/today-copy';
import { dayShareHero } from './day-share';
import type { DayShareContent } from './types/day-share';

/** Drawn at this width and exported at 1080, so the type scale is fixed, not fitted. */
export const DAY_SHARE_CARD_WIDTH = SHARE_POSTER_WIDTH;

/**
 * The day as a deck poster: streak (or today's tally) as one numeral, hairline
 * brand row. Same family as `SharePosterCard`, filled with the streak colour.
 */
export function DayShareCard({ content }: { content: DayShareContent }) {
  const { deckCards } = useTheme();
  const hero = dayShareHero(content);
  const valueMetrics = posterValueMetrics(hero.value);
  const brandMeta =
    content.streakDays > 1
      ? `${content.completedCount} of ${content.totalCount}`
      : `+${content.pointsToday}`;

  return (
    <View style={styles.shell} testID="home-day-share-card">
      <View style={[styles.fill, { backgroundColor: deckCards.streak }]} />
      <View style={styles.type}>
        <View style={styles.top}>
          <SharePosterText style={[styles.label, { color: deckCards.subtext }]}>
            {TODAY_COPY.dayDoneTitle}
          </SharePosterText>
          <SharePosterText style={[styles.label, { color: deckCards.subtext }]}>
            {content.weekday}
          </SharePosterText>
        </View>
        <SharePosterText
          adjustsFontSizeToFit
          numberOfLines={1}
          style={[styles.value, { color: deckCards.text }, valueMetrics]}
        >
          {hero.value}
        </SharePosterText>
        <SharePosterText style={[styles.unit, { color: deckCards.subtext }]}>
          {hero.unit}
        </SharePosterText>
        <View style={[styles.brand, { borderTopColor: deckCards.track }]}>
          <SharePosterText style={[styles.brandName, { color: deckCards.text }]}>
            {SHARE_COPY.brand}
          </SharePosterText>
          <SharePosterText style={[styles.label, { color: deckCards.subtext }]}>
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
