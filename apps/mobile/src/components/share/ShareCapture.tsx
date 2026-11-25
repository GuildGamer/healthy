import type { ReactNode, Ref } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  SHARE_POSTER_HEIGHT,
  SHARE_POSTER_WIDTH,
} from '@/components/challenges/SharePosterCard';
import type { ShareCorners } from '@/components/challenges/GymPhotoShareCard';
import {
  SHARE_STORIES_FRAME_HEIGHT,
  SHARE_STORIES_FRAME_WIDTH,
} from '@/lib/share-export';
import { ShareSocialFrame } from './ShareSocialFrame';

/**
 * Rounded preview on screen; square twin parked off-screen for `captureRef`.
 * The twin is a 9:16 social frame (card in the Stories safe zone) so Instagram
 * does not zoom-crop overlays. Explicit frame size is required — unsized hosts
 * rasterize as blank white. Callers that put ShareCapture inside a clipping
 * list cell must render the twin outside that cell instead.
 */
export function ShareCapture({
  shotRef,
  cardWidth = SHARE_POSTER_WIDTH,
  cardHeight = SHARE_POSTER_HEIGHT,
  children,
}: {
  shotRef: Ref<View>;
  /** Design size of the card inside the social frame. */
  cardWidth?: number;
  cardHeight?: number;
  children: (corners: ShareCorners) => ReactNode;
}) {
  return (
    <View style={styles.root}>
      {children('round')}
      <View
        accessibilityElementsHidden
        collapsable={false}
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        ref={shotRef}
        style={[
          styles.offscreen,
          {
            left: -SHARE_STORIES_FRAME_WIDTH * 4,
            width: SHARE_STORIES_FRAME_WIDTH,
            height: SHARE_STORIES_FRAME_HEIGHT,
          },
        ]}
        testID="share-capture-twin"
      >
        <ShareSocialFrame cardHeight={cardHeight} cardWidth={cardWidth}>
          {children('square')}
        </ShareSocialFrame>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  offscreen: {
    position: 'absolute',
    top: 0,
  },
});
