import type { ReactNode, Ref } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  SHARE_POSTER_HEIGHT,
  SHARE_POSTER_WIDTH,
} from '@/components/challenges/SharePosterCard';
import type { ShareCorners } from '@/components/challenges/GymPhotoShareCard';

/**
 * Rounded preview on screen; square twin parked off-screen for `captureRef`.
 * Explicit twin size is required — unsized hosts rasterize as blank white.
 * Do not wrap the twin in a Stories canvas here: WhatsApp / Messages should
 * get the card edge-to-edge. Instagram can letterbox at the destination.
 */
export function ShareCapture({
  shotRef,
  cardWidth = SHARE_POSTER_WIDTH,
  cardHeight = SHARE_POSTER_HEIGHT,
  children,
}: {
  shotRef: Ref<View>;
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
            left: -cardWidth * 4,
            width: cardWidth,
            height: cardHeight,
          },
        ]}
        testID="share-capture-twin"
      >
        {children('square')}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  offscreen: {
    position: 'absolute',
    top: 0,
  },
});
