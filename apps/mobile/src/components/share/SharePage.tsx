import { StyleSheet, View } from 'react-native';
import { GymPhotoShareCard } from '@/components/challenges/GymPhotoShareCard';
import { ProofVideoPlayer } from '@/components/challenges/ProofVideoPlayer';
import { SharePosterCard } from '@/components/challenges/SharePosterCard';
import type { ShareFillId } from '@/components/challenges/share-fill';
import type { SharePoster } from '@/components/challenges/types/share-poster';
import type { ShareRoutePoint } from '@/lib/share-route-path';
import type { ReactNode } from 'react';
import {
  designSizeForSharePage,
  sizeForSharePage,
  stageHeightForSharePage,
  type SetSharePage,
} from './set-share-layout';
import type { SetShareClipMedia } from './types/set-share-clip-media';

type SharePageProps = {
  page: SetSharePage;
  pageWidth: number;
  slotHeight: number;
  clip: SetShareClipMedia | null;
  renderVideo?: (clip: SetShareClipMedia) => ReactNode;
  poster: SharePoster;
  /** When set, the card's background is this gym selfie instead of a colour. */
  backgroundPhotoUri?: string | null;
  routePoints?: ShareRoutePoint[];
  runLine: string | null;
  fillId: ShareFillId;
  posterTestID: string;
};

/**
 * One page of the share pager: the clip or the card, laid out at its real
 * pixel size inside the stage the pager leaves for it. The card is a colour
 * or, when chosen, the gym selfie — the same 4:5 shape either way.
 */
export function SharePage({
  page,
  pageWidth,
  slotHeight,
  clip,
  renderVideo,
  poster,
  backgroundPhotoUri,
  routePoints,
  runLine,
  fillId,
  posterTestID,
}: SharePageProps) {
  const stageHeight = stageHeightForSharePage(page, slotHeight);
  const mediaSize = mediaSizeFor(page, pageWidth, slotHeight);
  const hasCardSize = mediaSize.width > 0 && mediaSize.height > 0;

  return (
    <View style={[styles.page, { width: pageWidth }]}>
      <View style={[styles.stage, stageHeight > 0 ? { height: stageHeight } : styles.stageUnmeasured]}>
        <View
          style={[
            styles.mediaFrame,
            hasCardSize ? { width: mediaSize.width, height: mediaSize.height } : null,
            page === 'video' ? styles.mediaFrameVideo : null,
          ]}
        >
          {page === 'video' && clip ? (
            <View style={styles.videoFill}>
              {renderVideo ? (
                renderVideo(clip)
              ) : (
                <ProofVideoPlayer
                  contentFit="contain"
                  fillParent
                  posterUri={clip.posterFrameUri}
                  uri={clip.playUri}
                />
              )}
            </View>
          ) : null}
          {page === 'poster' && hasCardSize ? (
            <View style={styles.posterHost} testID={posterTestID}>
              {backgroundPhotoUri ? (
                <GymPhotoShareCard
                  corners="round"
                  height={mediaSize.height}
                  photoUri={backgroundPhotoUri}
                  poster={poster}
                  runLine={runLine}
                  testID="gym-photo-share-card"
                  width={mediaSize.width}
                />
              ) : (
                <SharePosterCard
                  corners="round"
                  fillId={fillId}
                  height={mediaSize.height}
                  poster={poster}
                  routePoints={routePoints}
                  runLine={runLine}
                  testID="share-poster-image"
                  width={mediaSize.width}
                />
              )}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/**
 * Measured size once the slot has laid out. Before that (first paint, tests)
 * a card falls back to its design size so it is never missing.
 */
function mediaSizeFor(
  page: SetSharePage,
  pageWidth: number,
  slotHeight: number,
): { width: number; height: number } {
  const measured = sizeForSharePage(page, pageWidth, slotHeight);
  if (measured.width > 0 && measured.height > 0) {
    return measured;
  }
  const design = designSizeForSharePage(page);
  return design.width > 0 ? design : measured;
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: 0,
  },
  stage: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageUnmeasured: {
    flex: 1,
  },
  mediaFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  mediaFrameVideo: {
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    overflow: 'hidden',
    borderRadius: 12,
  },
  videoFill: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  posterHost: {
    width: '100%',
    height: '100%',
  },
});
