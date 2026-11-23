import { darkDeckCards, fontSize, fontWeight, spacing } from '@product/brand';
import { Image, StyleSheet, View } from 'react-native';
import { ShareBrandLockup } from '@/components/share';
import { DEFAULT_PHOTO_ASPECT_RATIO } from '@/lib/capture-selfie';
import { formatShareStamp } from './ChallengeShareCard';
import {
  SHARE_POSTER_PADDING,
  SHARE_POSTER_RADIUS,
  SHARE_POSTER_WIDTH,
} from './SharePosterCard';
import { SharePosterText } from './SharePosterText';
import type { SharePoster } from './types/share-poster';

export type ShareCorners = 'round' | 'square';

/**
 * Gym selfie as its own share page: the photo keeps its aspect, caption sits
 * in a footer under the pixels so type does not cover the image.
 */
export function GymPhotoShareCard({
  photoUri,
  poster,
  corners = 'round',
  aspectRatio = DEFAULT_PHOTO_ASPECT_RATIO,
  testID = 'gym-photo-share-card',
}: {
  photoUri: string;
  poster: SharePoster;
  corners?: ShareCorners;
  /** Width / height. Defaults to the camera’s 3:4 share ratio. */
  aspectRatio?: number;
  testID?: string;
}) {
  const radius = corners === 'round' ? SHARE_POSTER_RADIUS : 0;
  const safeAspect =
    aspectRatio > 0 && Number.isFinite(aspectRatio) ? aspectRatio : DEFAULT_PHOTO_ASPECT_RATIO;
  const photoHeight = SHARE_POSTER_WIDTH / safeAspect;
  const stamp = formatShareStamp(poster.when ? new Date(poster.when) : new Date());
  const imageTestID = corners === 'round' ? 'gym-photo-share-image' : undefined;

  return (
    <View style={[styles.shell, { borderRadius: radius }]} testID={testID}>
      <View style={[styles.photoFrame, { height: photoHeight, borderRadius: radius }]}>
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={{ uri: photoUri }}
          style={StyleSheet.absoluteFill}
          testID={imageTestID}
        />
      </View>
      <View style={styles.footer}>
        <SharePosterText style={[styles.label, { color: darkDeckCards.subtext }]}>
          {poster.label}
        </SharePosterText>
        <SharePosterText style={[styles.stamp, { color: darkDeckCards.subtext }]}>
          {stamp}
        </SharePosterText>
        <View style={[styles.brand, { borderTopColor: darkDeckCards.track }]}>
          <ShareBrandLockup color={darkDeckCards.text} />
          <SharePosterText style={[styles.label, { color: darkDeckCards.subtext }]}>
            {poster.unit}
          </SharePosterText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: SHARE_POSTER_WIDTH,
    overflow: 'hidden',
    backgroundColor: darkDeckCards.gym,
  },
  photoFrame: {
    width: SHARE_POSTER_WIDTH,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  footer: {
    padding: SHARE_POSTER_PADDING,
    gap: 4,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  stamp: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
