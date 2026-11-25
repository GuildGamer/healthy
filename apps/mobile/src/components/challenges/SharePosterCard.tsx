import { fontSize, fontWeight, spacing } from '@product/brand';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { ShareBrandLockup } from '@/components/share';
import { fitRouteToViewBox, type ShareRoutePoint } from '@/lib/share-route-path';
import { useTheme } from '@/theme';
import type { ShareCorners } from './GymPhotoShareCard';
import { weekdayName } from './reading-time';
import { shareFillStyle, type ShareFillId } from './share-fill';
import { posterValueMetrics, posterWhen } from './share-poster';
import { SharePosterText } from './SharePosterText';
import type { SharePoster } from './types/share-poster';

export const SHARE_POSTER_WIDTH = 300;
export const SHARE_POSTER_HEIGHT = 375;
export const SHARE_POSTER_RADIUS = 26;
/** Inset so type survives social crop / Stories chrome (~10%+ of the card). */
export const SHARE_POSTER_PADDING = 34;

/** Padding so the path sits in the middle band and leaves room for type. */
const ROUTE_PADDING = 44;

/**
 * The card the history Share screen shows, and the image a share sheet sends.
 * Pass width/height to fill the in-app pager slot; capture twins keep design size.
 */
export function SharePosterCard({
  poster,
  runLine,
  routePoints,
  fillId,
  corners = 'round',
  width = SHARE_POSTER_WIDTH,
  height = SHARE_POSTER_HEIGHT,
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
  width?: number;
  height?: number;
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
  const layoutScale = width / SHARE_POSTER_WIDTH;
  const baseValue = posterValueMetrics(poster.value);
  const valueMetrics = {
    fontSize: baseValue.fontSize * layoutScale,
    letterSpacing: baseValue.letterSpacing * layoutScale,
    lineHeight: baseValue.lineHeight * layoutScale,
  };
  const labelStyle = [
    styles.posterLabel,
    { color: ink.subtext, fontSize: fontSize.sm * layoutScale },
  ];
  const pathStroke = deckCards.tones.walk;
  const corner = poster.corner ?? weekdayName(posterWhen(poster));
  const radius = corners === 'round' ? SHARE_POSTER_RADIUS * layoutScale : 0;
  const pad = SHARE_POSTER_PADDING * layoutScale;
  const brandHeight = Math.round(40 * layoutScale);

  return (
    <View
      style={[
        styles.shell,
        { width, height },
        corners === 'round' ? { borderRadius: radius } : null,
      ]}
      testID={testID}
    >
      <View style={[styles.fill, { backgroundColor: fill, borderRadius: radius }]}>
        {hasRoute && routePoints ? (
          <PosterRoute
            height={height}
            pathStroke={pathStroke}
            points={routePoints}
            width={width}
          />
        ) : null}
      </View>
      <View style={[styles.type, { padding: pad }]}>
        <View style={styles.posterTop}>
          <SharePosterText style={labelStyle}>{poster.label}</SharePosterText>
          <SharePosterText style={labelStyle}>{corner}</SharePosterText>
        </View>
        <SharePosterText style={[styles.posterValue, { color: ink.text }, valueMetrics]}>
          {poster.value}
        </SharePosterText>
        <SharePosterText
          style={[
            styles.posterUnit,
            {
              color: ink.subtext,
              fontSize: 17 * layoutScale,
              marginTop: spacing.sm * layoutScale,
            },
          ]}
        >
          {poster.unit}
        </SharePosterText>
        {poster.facts && poster.facts.length > 0 ? (
          <View
            style={[
              styles.posterFacts,
              { gap: 12 * layoutScale, marginTop: 16 * layoutScale },
            ]}
          >
            {poster.facts.map((fact) => (
              <View key={fact.label} style={styles.posterFact}>
                <SharePosterText
                  style={[
                    styles.posterFactValue,
                    { color: ink.text, fontSize: 16 * layoutScale },
                  ]}
                >
                  {fact.value}
                </SharePosterText>
                <SharePosterText
                  style={[
                    styles.posterFactLabel,
                    { color: ink.subtext, fontSize: 11 * layoutScale },
                  ]}
                >
                  {fact.label}
                </SharePosterText>
              </View>
            ))}
          </View>
        ) : null}
        <View
          style={[
            styles.posterBrand,
            {
              borderTopColor: ink.track,
              marginTop: 20 * layoutScale,
              paddingTop: 14 * layoutScale,
            },
          ]}
        >
          <ShareBrandLockup color={ink.text} height={brandHeight} />
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
  width,
  height,
}: {
  points: ShareRoutePoint[];
  pathStroke: string;
  width: number;
  height: number;
}) {
  const routePad = ROUTE_PADDING * (width / SHARE_POSTER_WIDTH);
  const fitted = fitRouteToViewBox(points, width, height, routePad);
  if (!fitted) {
    return null;
  }

  const strokeWidth = 3.5 * (width / SHARE_POSTER_WIDTH);

  return (
    <Svg
      height={height}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      testID="share-poster-route"
      viewBox={`0 0 ${fitted.viewBoxWidth} ${fitted.viewBoxHeight}`}
      width={width}
    >
      <Path
        d={fitted.pathD}
        fill="none"
        stroke={pathStroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={0.92}
        strokeWidth={strokeWidth}
      />
      <Circle
        cx={fitted.start.x}
        cy={fitted.start.y}
        fill={pathStroke}
        fillOpacity={0.45}
        r={5 * (width / SHARE_POSTER_WIDTH)}
      />
      <Circle
        cx={fitted.end.x}
        cy={fitted.end.y}
        fill={pathStroke}
        r={6 * (width / SHARE_POSTER_WIDTH)}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  /**
   * Outer shell keeps type outside a hard clip so emoji paint on iOS. Round
   * preview still gets a soft silhouette via fill radius + shell radius.
   */
  shell: {},
  fill: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  type: {
    flex: 1,
  },
  posterTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  posterLabel: {
    fontWeight: fontWeight.medium,
  },
  posterValue: {
    fontWeight: fontWeight.semibold,
    marginTop: 'auto',
    zIndex: 1,
  },
  posterUnit: {
    zIndex: 1,
  },
  posterFacts: {
    flexDirection: 'row',
    zIndex: 1,
  },
  posterFact: {
    flex: 1,
    gap: 2,
  },
  posterFactValue: {
    fontWeight: fontWeight.semibold,
  },
  posterFactLabel: {
    fontWeight: fontWeight.medium,
  },
  posterBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    zIndex: 1,
  },
});
