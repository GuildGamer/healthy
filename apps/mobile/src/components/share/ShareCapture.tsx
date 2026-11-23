import type { ReactNode, Ref } from 'react';
import { StyleSheet, View } from 'react-native';
import { SHARE_POSTER_WIDTH } from '@/components/challenges/SharePosterCard';
import type { ShareCorners } from '@/components/challenges/GymPhotoShareCard';

/**
 * Rounded preview on screen; square twin off-screen for `captureRef`. The twin
 * must not sit inside a clipped rounded parent, or the PNG stays rounded.
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
    left: -SHARE_POSTER_WIDTH * 4,
    width: SHARE_POSTER_WIDTH,
  },
});
