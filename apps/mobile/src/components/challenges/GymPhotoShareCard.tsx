import { darkDeckCards, fontSize, fontWeight, spacing } from '@product/brand';
import { Image, StyleSheet, View } from 'react-native';
import { ShareBrandLockup } from '@/components/share';
import { PhotoFade } from './PhotoFade';
import {
  SHARE_POSTER_HEIGHT,
  SHARE_POSTER_PADDING,
  SHARE_POSTER_RADIUS,
  SHARE_POSTER_WIDTH,
} from './SharePosterCard';
import { SharePosterText } from './SharePosterText';
import { weekdayName } from './reading-time';
import { posterWhen } from './share-poster';
import type { SharePoster } from './types/share-poster';

export type ShareCorners = 'round' | 'square';

/**
 * Gym selfie as its own share page. The photo fills the card. The same lines
 * as the colour poster sit in the top and bottom bands, with the time at
 * caption size so it does not cover the face. Preview corners are soft; the
 * capture twin is square.
 */
export function GymPhotoShareCard({
  photoUri,
  poster,
  runLine = null,
  corners = 'round',
  testID = 'gym-photo-share-card',
}: {
  photoUri: string;
  poster: SharePoster;
  /** "4 days running", when this finish has a streak to show. */
  runLine?: string | null;
  corners?: ShareCorners;
  testID?: string;
}) {
  const radius = corners === 'round' ? SHARE_POSTER_RADIUS : 0;
  const corner = poster.corner ?? weekdayName(posterWhen(poster));
  const imageTestID = corners === 'round' ? 'gym-photo-share-image' : undefined;

  return (
    <View style={[styles.shell, { borderRadius: radius }]} testID={testID}>
      <View style={[styles.photo, { borderRadius: radius }]}>
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="cover"
          source={{ uri: photoUri }}
          style={StyleSheet.absoluteFill}
          testID={imageTestID}
        />
        <PhotoFade edge="top" height="22%" maxOpacity={0.45} />
        <PhotoFade edge="bottom" height="46%" maxOpacity={0.72} />
      </View>
      <View pointerEvents="none" style={styles.type}>
        <View style={styles.top}>
          <SharePosterText
            numberOfLines={1}
            plainStyle={onPhoto}
            style={[styles.label, styles.labelShrink, { color: darkDeckCards.text }]}
          >
            {poster.label}
          </SharePosterText>
          <SharePosterText
            numberOfLines={1}
            plainStyle={onPhoto}
            style={[styles.label, { color: darkDeckCards.text }]}
          >
            {corner}
          </SharePosterText>
        </View>
        <View style={styles.caption}>
          <SharePosterText
            numberOfLines={1}
            plainStyle={onPhoto}
            style={[styles.time, { color: darkDeckCards.text }]}
          >
            {poster.value}
          </SharePosterText>
          <SharePosterText
            numberOfLines={1}
            plainStyle={onPhoto}
            style={[styles.unit, { color: darkDeckCards.subtext }]}
          >
            {poster.unit}
          </SharePosterText>
          <View style={[styles.brand, { borderTopColor: darkDeckCards.track }]}>
            <ShareBrandLockup color={darkDeckCards.text} />
            {runLine ? (
              <SharePosterText
                numberOfLines={1}
                plainStyle={onPhoto}
                style={[styles.label, { color: darkDeckCards.subtext }]}
              >
                {runLine}
              </SharePosterText>
            ) : null}
          </View>
        </View>
      </View>
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
  shell: {
    width: SHARE_POSTER_WIDTH,
    height: SHARE_POSTER_HEIGHT,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  photo: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  type: {
    flex: 1,
    padding: SHARE_POSTER_PADDING,
    justifyContent: 'space-between',
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  labelShrink: {
    flexShrink: 1,
  },
  caption: {
    gap: spacing.xs,
  },
  time: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.semibold,
    letterSpacing: -0.6,
    lineHeight: 36,
  },
  unit: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
});
