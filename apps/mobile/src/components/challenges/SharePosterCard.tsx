import { darkDeckCards, fontSize, fontWeight, spacing } from '@product/brand';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import { SHARE_COPY } from './constants/doing-copy';
import { PhotoFade } from './PhotoFade';
import { weekdayName } from './reading-time';
import { posterValueMetrics, posterWhen } from './share-poster';
import type { SharePoster } from './types/share-poster';

export const SHARE_POSTER_WIDTH = 300;
export const SHARE_POSTER_HEIGHT = 375;

/** Smaller than the plain card's numeral so the selfie, not the time, carries the photo card. */
const PHOTO_VALUE_METRICS = { fontSize: 64, letterSpacing: -2, lineHeight: 68 } as const;

/** The card the history Share screen shows, and the image a share sheet sends. */
export function SharePosterCard({
  poster,
  runLine,
  photoUri,
  testID = 'share-poster-image',
}: {
  poster: SharePoster;
  runLine: string | null;
  /** The gym selfie for this finish; the card's fill gives way to it. */
  photoUri?: string;
  testID?: string;
}) {
  const { deckCards } = useTheme();
  const ink = photoUri ? darkDeckCards : deckCards;
  const overPhoto = photoUri ? styles.overPhoto : null;
  const valueMetrics = photoUri ? PHOTO_VALUE_METRICS : posterValueMetrics(poster.value);
  const labelStyle = [styles.posterLabel, { color: ink.subtext }, overPhoto];

  return (
    <View style={[styles.poster, { backgroundColor: deckCards[poster.kind] }]} testID={testID}>
      {photoUri ? <PosterPhoto photoUri={photoUri} /> : null}
      <View style={styles.posterTop}>
        <Text style={labelStyle}>{poster.label}</Text>
        <Text style={labelStyle}>{weekdayName(posterWhen(poster))}</Text>
      </View>
      <Text style={[styles.posterValue, { color: ink.text }, valueMetrics, overPhoto]}>
        {poster.value}
      </Text>
      <Text style={[styles.posterUnit, { color: ink.subtext }, overPhoto]}>{poster.unit}</Text>
      <View style={[styles.posterBrand, { borderTopColor: ink.track }]}>
        <Text style={[styles.posterBrandName, { color: ink.text }, overPhoto]}>
          {SHARE_COPY.brand}
        </Text>
        {runLine ? <Text style={labelStyle}>{runLine}</Text> : null}
      </View>
    </View>
  );
}

/** The selfie edge to edge, darkened top and bottom so the poster's type reads on any gym. */
function PosterPhoto({ photoUri }: { photoUri: string }) {
  return (
    <>
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="cover"
        source={{ uri: photoUri }}
        style={StyleSheet.absoluteFill}
        testID="share-poster-photo"
      />
      <PhotoFade edge="top" height="30%" maxOpacity={0.55} />
      <PhotoFade edge="bottom" height="52%" maxOpacity={0.85} />
    </>
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
  posterTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  posterLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  posterValue: {
    fontWeight: fontWeight.semibold,
    marginTop: 'auto',
  },
  posterUnit: {
    fontSize: 17,
    marginTop: spacing.sm,
  },
  posterBrand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  posterBrandName: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
  },
  overPhoto: {
    textShadowColor: 'rgba(5, 8, 14, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
});
