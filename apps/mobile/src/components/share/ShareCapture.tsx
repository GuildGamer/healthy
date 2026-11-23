import type { ReactNode, Ref } from 'react';
import { StyleSheet, View } from 'react-native';
import { SHARE_POSTER_WIDTH } from '@/components/challenges/SharePosterCard';
import type { ShareCorners } from '@/components/challenges/GymPhotoShareCard';

/**
 * Rounded preview on screen; square twin parked off-screen for `captureRef`.
 * The twin must not sit inside a clipped rounded parent, or the PNG stays
 * rounded. `overflow: hidden` on the root keeps a mis-parked twin from
 * stacking on the preview (sharp corners + "two cards").
 */
export function ShareCapture({
  shotRef,
  children,
}: {
  shotRef: Ref<View>;
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
        style={styles.offscreen}
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
    left: 0,
    width: SHARE_POSTER_WIDTH,
    // translateX survives nested scales better than a raw negative `left`.
    transform: [{ translateX: -SHARE_POSTER_WIDTH * 4 }],
  },
});
