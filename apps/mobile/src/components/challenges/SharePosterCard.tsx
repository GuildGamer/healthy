import { darkDeckCards, fontSize, fontWeight, spacing } from '@product/brand';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { fitRouteToViewBox, type ShareRoutePoint } from '@/lib/share-route-path';
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

/** Padding so the path sits in the middle band and leaves room for type. */
const ROUTE_PADDING = 44;

/** The card the history Share screen shows, and the image a share sheet sends. */
export function SharePosterCard({
  poster,
  runLine,
  photoUri,
  routePoints,
  testID = 'share-poster-image',
}: {
  poster: SharePoster;
  runLine: string | null;
  /** The gym selfie for this finish; the card's fill gives way to it. */
  photoUri?: string;
  /** Walk GPS path for this finish; history shares omit it. */
  routePoints?: ShareRoutePoint[];
  testID?: string;
}) {
  const { deckCards } = useTheme();
  const hasPhoto = Boolean(photoUri);
  const hasRoute = Boolean(routePoints && routePoints.length >= 2 && !hasPhoto);
  const ink = hasPhoto ? darkDeckCards : deckCards;
  const overPhoto = hasPhoto ? styles.overPhoto : null;
  const valueMetrics = hasPhoto ? PHOTO_VALUE_METRICS : posterValueMetrics(poster.value);
  const labelStyle = [styles.posterLabel, { color: ink.subtext }, overPhoto];
  const pathStroke = deckCards.tones.walk;
  const fill = poster.kind === 'streak' ? deckCards.streak : deckCards[poster.kind];
  const corner = poster.corner ?? weekdayName(posterWhen(poster));

  return (
    <View style={[styles.poster, { backgroundColor: fill }]} testID={testID}>
      {photoUri ? <PosterPhoto photoUri={photoUri} /> : null}
      {hasRoute && routePoints ? (
        <PosterRoute pathStroke={pathStroke} points={routePoints} />
      ) : null}
      <View style={styles.posterTop}>
        <Text style={labelStyle}>{poster.label}</Text>
        <Text style={labelStyle}>{corner}</Text>
      </View>
      <Text style={[styles.posterValue, { color: ink.text }, valueMetrics, overPhoto]}>
        {poster.value}
      </Text>
      <Text style={[styles.posterUnit, { color: ink.subtext }, overPhoto]}>{poster.unit}</Text>
      {poster.facts && poster.facts.length > 0 ? (
        <View style={styles.posterFacts}>
          {poster.facts.map((fact) => (
            <View key={fact.label} style={styles.posterFact}>
              <Text style={[styles.posterFactValue, { color: ink.text }, overPhoto]}>
                {fact.value}
              </Text>
              <Text style={[styles.posterFactLabel, { color: ink.subtext }, overPhoto]}>
                {fact.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
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

/** Full-bleed path silhouette — shape of the walk, no street map. */
function PosterRoute({
  points,
  pathStroke,
}: {
  points: ShareRoutePoint[];
  pathStroke: string;
}) {
  const fitted = fitRouteToViewBox(points, SHARE_POSTER_WIDTH, SHARE_POSTER_HEIGHT, ROUTE_PADDING);
  if (!fitted) {
    return null;
  }

  return (
    <Svg
      height={SHARE_POSTER_HEIGHT}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      testID="share-poster-route"
      viewBox={`0 0 ${fitted.viewBoxWidth} ${fitted.viewBoxHeight}`}
      width={SHARE_POSTER_WIDTH}
    >
      <Path
        d={fitted.pathD}
        fill="none"
        stroke={pathStroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={0.92}
        strokeWidth={3.5}
      />
      <Circle cx={fitted.start.x} cy={fitted.start.y} fill={pathStroke} fillOpacity={0.45} r={5} />
      <Circle cx={fitted.end.x} cy={fitted.end.y} fill={pathStroke} r={6} />
    </Svg>
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
    zIndex: 1,
  },
  posterLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  posterValue: {
    fontWeight: fontWeight.semibold,
    marginTop: 'auto',
    zIndex: 1,
  },
  posterUnit: {
    fontSize: 17,
    marginTop: spacing.sm,
    zIndex: 1,
  },
  posterFacts: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    zIndex: 1,
  },
  posterFact: {
    flex: 1,
    gap: 2,
  },
  posterFactValue: {
    fontSize: 16,
    fontWeight: fontWeight.semibold,
  },
  posterFactLabel: {
    fontSize: 11,
    fontWeight: fontWeight.medium,
  },
  posterBrand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    zIndex: 1,
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
