import { darkDeckCards, fontSize, fontWeight, spacing } from '@product/brand';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ShareBrandLockup } from '@/components/share';
import { PhotoFade } from './PhotoFade';
import { SHARE_POSTER_RADIUS } from './SharePosterCard';
import { SharePosterText } from './SharePosterText';
import { weekdayName } from './reading-time';
import { posterWhen } from './share-poster';
import type { SharePoster } from './types/share-poster';

export type ShareCorners = 'round' | 'square';

/**
 * Phone-selfie canvas (3:4): taller than wide, not Stories-tall. Kept separate
 * from the colour poster so a gym photo reads as a photo, not a deck slip.
 */
export const GYM_PHOTO_SHARE_WIDTH = 300;
export const GYM_PHOTO_SHARE_HEIGHT = 400;
export const GYM_PHOTO_SHARE_ASPECT = GYM_PHOTO_SHARE_WIDTH / GYM_PHOTO_SHARE_HEIGHT;

/**
 * Type inset for the photo card. Larger than the colour poster so labels clear
 * the soft radius — overflow clips the photo only, not the type layer.
 */
export const GYM_PHOTO_TYPE_PADDING = 44;

/**
 * Gym selfie as its own share page. The photo fills a 3:4 card. The same lines
 * as the colour poster sit in the top and bottom bands, with the time at
 * caption size so it does not cover the face. Preview corners are soft; the
 * capture twin is square.
 *
 * Pass width/height to size the in-app preview to the pager slot. Capture twins
 * keep the design size so exports stay sharp and consistent.
 */
export function GymPhotoShareCard({
  photoUri,
  poster,
  runLine = null,
  corners = 'round',
  width = GYM_PHOTO_SHARE_WIDTH,
  height = GYM_PHOTO_SHARE_HEIGHT,
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
  // Capture twin must paint immediately — a deferred reveal blanks view-shot.
  const [photoReady, setPhotoReady] = useState(corners === 'square');
  const layoutScale = width / GYM_PHOTO_SHARE_WIDTH;
  const radius = corners === 'round' ? SHARE_POSTER_RADIUS * layoutScale : 0;
  const pad = GYM_PHOTO_TYPE_PADDING * layoutScale;
  const corner = poster.corner ?? weekdayName(posterWhen(poster));
  const imageTestID = corners === 'round' ? 'gym-photo-share-image' : undefined;
  const labelSize = fontSize.sm * layoutScale;
  const timeSize = fontSize.xxl * layoutScale;
  const unitSize = fontSize.md * layoutScale;
  const brandHeight = Math.round(40 * layoutScale);

  return (
    <View
      collapsable={false}
      style={[
        styles.shell,
        {
          width,
          height,
          borderRadius: radius,
        },
      ]}
      testID={testID}
    >
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
        {photoReady ? (
          <>
            <PhotoFade edge="top" height="16%" maxOpacity={0.38} />
            <PhotoFade edge="bottom" height="28%" maxOpacity={0.58} />
          </>
        ) : null}
      </View>
      {photoReady ? (
        <View
          pointerEvents="none"
          style={[
            styles.type,
            {
              paddingTop: pad,
              paddingHorizontal: pad,
              paddingBottom: pad + 10 * layoutScale,
            },
          ]}
        >
          <View style={styles.top}>
            <SharePosterText
              numberOfLines={1}
              plainStyle={onPhoto}
              style={[
                styles.label,
                styles.labelShrink,
                { color: darkDeckCards.text, fontSize: labelSize },
              ]}
            >
              {poster.label}
            </SharePosterText>
            <SharePosterText
              numberOfLines={1}
              plainStyle={onPhoto}
              style={[
                styles.label,
                styles.labelShrink,
                { color: darkDeckCards.text, fontSize: labelSize },
              ]}
            >
              {corner}
            </SharePosterText>
          </View>
          <View style={styles.caption}>
            <SharePosterText
              numberOfLines={1}
              plainStyle={onPhoto}
              style={[
                styles.time,
                {
                  color: darkDeckCards.text,
                  fontSize: timeSize,
                  lineHeight: timeSize * 1.125,
                  letterSpacing: -0.6 * layoutScale,
                },
              ]}
            >
              {poster.value}
            </SharePosterText>
            <SharePosterText
              numberOfLines={1}
              plainStyle={onPhoto}
              style={[styles.unit, { color: darkDeckCards.subtext, fontSize: unitSize }]}
            >
              {poster.unit}
            </SharePosterText>
            <View
              style={[
                styles.brand,
                {
                  borderTopColor: darkDeckCards.track,
                  marginTop: spacing.sm * layoutScale,
                  paddingTop: 14 * layoutScale,
                },
              ]}
            >
              <ShareBrandLockup color={darkDeckCards.text} height={brandHeight} />
              {runLine ? (
                <SharePosterText
                  numberOfLines={1}
                  plainStyle={onPhoto}
                  style={[
                    styles.label,
                    styles.labelShrink,
                    { color: darkDeckCards.subtext, fontSize: labelSize },
                  ]}
                >
                  {runLine}
                </SharePosterText>
              ) : null}
            </View>
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
   * No overflow clip on the shell — that was cutting type into the soft
   * radius. The photo layer clips itself; type stays fully painted.
   */
  shell: {
    backgroundColor: 'transparent',
  },
  photo: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  type: {
    flex: 1,
    justifyContent: 'space-between',
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  label: {
    fontWeight: fontWeight.medium,
  },
  labelShrink: {
    flexShrink: 1,
  },
  caption: {
    gap: spacing.xs,
  },
  time: {
    fontWeight: fontWeight.semibold,
  },
  unit: {
    fontWeight: fontWeight.medium,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
});
