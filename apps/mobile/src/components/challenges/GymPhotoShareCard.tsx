import { darkDeckCards, fontWeight, spacing } from '@product/brand';
import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { ShareBrandLockup } from '@/components/share/ShareBrandLockup';
import { PhotoFade } from './PhotoFade';
import {
  SHARE_POSTER_HEIGHT,
  SHARE_POSTER_PADDING,
  SHARE_POSTER_RADIUS,
  SHARE_POSTER_WIDTH,
} from './SharePosterCard';
import { SharePosterText } from './SharePosterText';
import type { SharePoster } from './types/share-poster';

export type ShareCorners = 'round' | 'square';

/** Design sizes of the bottom block, at the card's 300pt width. */
const TIME_SIZE = 26;
const UNIT_SIZE = 14;
const RUN_SIZE = 12;
const LOCKUP_HEIGHT = 30;
const UNIT_GAP = 2;
const BRAND_GAP = 10;

/**
 * The gym selfie as a background of the share card. Same 4:5 shape, margin and
 * corners as the colour card; the photo fills it and only a small block sits at
 * the bottom (time, unit, lockup, run) so the face stays clear. Preview corners
 * are soft; the capture twin is square and paints immediately.
 *
 * While the photo decodes, the card shows in the gym colour with a spinner so
 * the stage is never a blank hole. Pass width/height to size the in-app preview
 * to the stage. Everything inside scales with the width except the corner
 * radius, which stays fixed.
 */
export function GymPhotoShareCard({
  photoUri,
  poster,
  runLine = null,
  corners = 'round',
  width = SHARE_POSTER_WIDTH,
  height = SHARE_POSTER_HEIGHT,
  testID = 'gym-photo-share-card',
}: {
  photoUri: string;
  poster: SharePoster;
  /** "4 days running", when this finish has a streak to show. */
  runLine?: string | null;
  corners?: ShareCorners;
  width?: number;
  height?: number;
  testID?: string;
}) {
  // The capture twin must paint immediately — a deferred reveal blanks view-shot.
  const [photoReady, setPhotoReady] = useState(corners === 'square');
  const layoutScale = width / SHARE_POSTER_WIDTH;
  const radius = corners === 'round' ? SHARE_POSTER_RADIUS : 0;
  const imageTestID = corners === 'round' ? 'gym-photo-share-image' : undefined;

  return (
    <View
      collapsable={false}
      style={[styles.shell, { width, height, borderRadius: radius }]}
      testID={testID}
    >
      {!photoReady ? (
        <View
          style={[
            styles.loading,
            { borderRadius: radius, backgroundColor: darkDeckCards.gym },
          ]}
          testID="gym-photo-share-loading"
        >
          <ActivityIndicator color={darkDeckCards.text} />
        </View>
      ) : null}
      <View style={[styles.photo, { borderRadius: radius }]}>
        <Image
          accessibilityIgnoresInvertColors
          onLoad={() => setPhotoReady(true)}
          onLoadEnd={() => setPhotoReady(true)}
          resizeMode="cover"
          source={{ uri: photoUri }}
          style={[StyleSheet.absoluteFill, { opacity: photoReady ? 1 : 0 }]}
          testID={imageTestID}
        />
        {photoReady ? <PhotoFade edge="bottom" height="38%" maxOpacity={0.62} /> : null}
      </View>
      {photoReady ? (
        <View
          pointerEvents="none"
          style={[styles.type, { padding: SHARE_POSTER_PADDING * layoutScale }]}
        >
          <SharePosterText
            numberOfLines={1}
            plainStyle={onPhoto}
            style={[
              styles.time,
              {
                fontSize: TIME_SIZE * layoutScale,
                lineHeight: TIME_SIZE * 1.1 * layoutScale,
                letterSpacing: -0.5 * layoutScale,
              },
            ]}
          >
            {poster.value}
          </SharePosterText>
          <SharePosterText
            numberOfLines={1}
            plainStyle={onPhoto}
            style={[
              styles.unit,
              { fontSize: UNIT_SIZE * layoutScale, marginTop: UNIT_GAP * layoutScale },
            ]}
          >
            {poster.unit}
          </SharePosterText>
          <View
            style={[
              styles.brand,
              { marginTop: BRAND_GAP * layoutScale, paddingTop: BRAND_GAP * layoutScale },
            ]}
          >
            <ShareBrandLockup
              color={darkDeckCards.text}
              height={Math.round(LOCKUP_HEIGHT * layoutScale)}
            />
            {runLine ? (
              <SharePosterText
                numberOfLines={1}
                plainStyle={onPhoto}
                style={[styles.run, { fontSize: RUN_SIZE * layoutScale }]}
              >
                {runLine}
              </SharePosterText>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** One shadow so white type stays readable on a bright gym ceiling. */
const onPhoto = {
  textShadowColor: 'rgba(11, 18, 32, 0.55)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 8,
} as const;

const styles = StyleSheet.create({
  /**
   * No overflow clip and no fill on the shell — the photo layer clips itself,
   * so type is never cut by the soft corners and nothing flashes black.
   */
  shell: {
    backgroundColor: 'transparent',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  type: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  time: {
    color: darkDeckCards.text,
    fontWeight: fontWeight.semibold,
  },
  unit: {
    color: darkDeckCards.subtext,
    fontWeight: fontWeight.medium,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: darkDeckCards.track,
    gap: spacing.md,
  },
  run: {
    flexShrink: 1,
    color: darkDeckCards.subtext,
    fontWeight: fontWeight.medium,
  },
});
