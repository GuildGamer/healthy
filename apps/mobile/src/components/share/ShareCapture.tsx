import type { ReactNode, Ref } from 'react';
import { StyleSheet, View } from 'react-native';
import { SHARE_POSTER_WIDTH } from '@/components/challenges/SharePosterCard';
import type { ShareCorners } from '@/components/challenges/GymPhotoShareCard';

/**
 * Rounded preview on screen; square twin parked off-screen for `captureRef`.
 * The twin must not sit inside a clipped rounded parent, or the PNG stays
 * rounded. Park with a large negative `left` (not `translateX`) and keep this
 * root free of `overflow: 'hidden'` — clipped off-screen twins rasterize blank
 * in react-native-view-shot. Callers that put ShareCapture inside a clipping
 * list cell (e.g. FlatList) must render the twin outside that cell instead.
 */
export function ShareCapture({
  shotRef,
  captureWidth = SHARE_POSTER_WIDTH,
  children,
}: {
  shotRef: Ref<View>;
  /** Design width of the square twin; default matches the colour poster. */
  captureWidth?: number;
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
        style={[styles.offscreen, { left: -captureWidth * 4, width: captureWidth }]}
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
  },
  offscreen: {
    position: 'absolute',
    top: 0,
  },
});
