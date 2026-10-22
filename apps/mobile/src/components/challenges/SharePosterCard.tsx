import { fontSize, fontWeight, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { SHARE_COPY } from './constants/doing-copy';
import { weekdayName } from './reading-time';
import { posterValueMetrics, posterWhen } from './share-poster';
import type { SharePoster } from './types/share-poster';

export const SHARE_POSTER_WIDTH = 300;
export const SHARE_POSTER_HEIGHT = 375;

/** The card the history Share screen shows, and the image a share sheet sends. */
export function SharePosterCard({
  poster,
  runLine,
  testID = 'share-poster-image',
}: {
  poster: SharePoster;
  runLine: string | null;
  testID?: string;
}) {
  const { deckCards } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.poster, { backgroundColor: deckCards[poster.kind] }]} testID={testID}>
      <View style={styles.posterTop}>
        <Text style={styles.posterLabel}>{poster.label}</Text>
        <Text style={styles.posterLabel}>{weekdayName(posterWhen(poster))}</Text>
      </View>
      <Text style={[styles.posterValue, posterValueMetrics(poster.value)]}>{poster.value}</Text>
      <Text style={styles.posterUnit}>{poster.unit}</Text>
      <View style={styles.posterBrand}>
        <Text style={styles.posterBrandName}>{SHARE_COPY.brand}</Text>
        {runLine ? <Text style={styles.posterLabel}>{runLine}</Text> : null}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    poster: {
      width: SHARE_POSTER_WIDTH,
      height: SHARE_POSTER_HEIGHT,
      borderRadius: 26,
      padding: 22,
    },
    posterTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    posterLabel: {
      color: theme.deckCards.subtext,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
    },
    posterValue: {
      color: theme.deckCards.text,
      fontSize: 120,
      fontWeight: fontWeight.semibold,
      letterSpacing: -6,
      lineHeight: 120,
      marginTop: 'auto',
    },
    posterUnit: {
      color: theme.deckCards.subtext,
      fontSize: 17,
      marginTop: spacing.sm,
    },
    posterBrand: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
      paddingTop: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.deckCards.track,
    },
    posterBrandName: {
      color: theme.deckCards.text,
      fontSize: 13,
      fontWeight: fontWeight.semibold,
    },
  });
