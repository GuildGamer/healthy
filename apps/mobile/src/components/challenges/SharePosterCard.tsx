import { fontSize, fontWeight, spacing } from '@product/brand';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { fitRouteToViewBox, type ShareRoutePoint } from '@/lib/share-route-path';
import { useTheme } from '@/theme';
import type { ShareCorners } from './GymPhotoShareCard';
import { SHARE_COPY } from './constants/doing-copy';
import { weekdayName } from './reading-time';
import { shareFillStyle, type ShareFillId } from './share-fill';
import { posterValueMetrics, posterWhen } from './share-poster';
import { SharePosterText } from './SharePosterText';
import type { SharePoster } from './types/share-poster';

export const SHARE_POSTER_WIDTH = 300;
export const SHARE_POSTER_HEIGHT = 375;
export const SHARE_POSTER_RADIUS = 26;
export const SHARE_POSTER_PADDING = 22;

/** Padding so the path sits in the middle band and leaves room for type. */
const ROUTE_PADDING = 44;

/** The card the history Share screen shows, and the image a share sheet sends. */
export function SharePosterCard({
  poster,
  runLine,
  routePoints,
  fillId,
  corners = 'round',
  testID = 'share-poster-image',
}: {
  poster: SharePoster;
  runLine: string | null;
  /** Walk GPS path for this finish; history shares omit it. */
  routePoints?: ShareRoutePoint[];
  /** Optional colour override from the share fill carousel. */
  fillId?: ShareFillId;
  /** Preview stays rounded; the capture twin is square. */
  corners?: ShareCorners;
  testID?: string;
}) {
  const { deckCards } = useTheme();
  const hasRoute = Boolean(routePoints && routePoints.length >= 2);
  const chosen = fillId ? shareFillStyle(fillId) : null;
  const themeFill = poster.kind === 'streak' ? deckCards.streak : deckCards[poster.kind];
  const fill = chosen?.backgroundColor ?? themeFill;
  const ink = chosen
    ? { text: chosen.text, subtext: chosen.subtext, track: chosen.track }
    : deckCards;
  const valueMetrics = posterValueMetrics(poster.value);
  const labelStyle = [styles.posterLabel, { color: ink.subtext }];
  const pathStroke = deckCards.tones.walk;
  const corner = poster.corner ?? weekdayName(posterWhen(poster));
  const radius = corners === 'round' ? SHARE_POSTER_RADIUS : 0;

  return (
    <View style={styles.shell} testID={testID}>
      <View style={[styles.fill, { backgroundColor: fill, borderRadius: radius }]}>
        {hasRoute && routePoints ? (
          <PosterRoute pathStroke={pathStroke} points={routePoints} />
        ) : null}
      </View>
      <View style={styles.type}>
        <View style={styles.posterTop}>
          <SharePosterText style={labelStyle}>{poster.label}</SharePosterText>
          <SharePosterText style={labelStyle}>{corner}</SharePosterText>
        </View>
        <SharePosterText style={[styles.posterValue, { color: ink.text }, valueMetrics]}>
          {poster.value}
        </SharePosterText>
        <SharePosterText style={[styles.posterUnit, { color: ink.subtext }]}>
          {poster.unit}
        </SharePosterText>
        {poster.facts && poster.facts.length > 0 ? (
          <View style={styles.posterFacts}>
            {poster.facts.map((fact) => (
              <View key={fact.label} style={styles.posterFact}>
                <SharePosterText style={[styles.posterFactValue, { color: ink.text }]}>
                  {fact.value}
                </SharePosterText>
                <SharePosterText style={[styles.posterFactLabel, { color: ink.subtext }]}>
                  {fact.label}
                </SharePosterText>
              </View>
            ))}
          </View>
        ) : null}
        <View style={[styles.posterBrand, { borderTopColor: ink.track }]}>
          <SharePosterText style={[styles.posterBrandName, { color: ink.text }]}>
            {SHARE_COPY.brand}
          </SharePosterText>
          {runLine ? <SharePosterText style={labelStyle}>{runLine}</SharePosterText> : null}
        </View>
      </View>
    </View>
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
  /** Outer shell keeps type outside the clipped fill so emoji paint on iOS. */
  shell: {
    width: SHARE_POSTER_WIDTH,
    height: SHARE_POSTER_HEIGHT,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  type: {
    flex: 1,
    padding: SHARE_POSTER_PADDING,
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
});
