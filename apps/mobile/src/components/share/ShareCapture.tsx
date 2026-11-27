import { type ReactNode, type Ref, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import {
  SHARE_POSTER_HEIGHT,
  SHARE_POSTER_WIDTH,
} from '@/components/challenges/SharePosterCard';
import type { ShareCorners } from '@/components/challenges/GymPhotoShareCard';
import { fitShareCard } from './set-share-layout';
import type { ShareCardSize } from './types/share-card-size';

/**
 * Rounded preview on screen; square twin parked off-screen for `captureRef`.
 * Explicit twin size is required — unsized hosts rasterize as blank white.
 * Do not wrap the twin in a Stories canvas here: WhatsApp / Messages should
 * get the card edge-to-edge. Instagram can letterbox at the destination.
 *
 * With `fitToSlot` the preview takes the largest 4:5 card the space allows,
 * the same card size the clip-finish pager uses. The twin always stays at the
 * design size, so exports are identical either way.
 */
export function ShareCapture({
  shotRef,
  cardWidth = SHARE_POSTER_WIDTH,
  cardHeight = SHARE_POSTER_HEIGHT,
  fitToSlot = false,
  children,
}: {
  shotRef: Ref<View>;
  cardWidth?: number;
  cardHeight?: number;
  /** Fill the space the parent gives and size the preview card to it. */
  fitToSlot?: boolean;
  children: (corners: ShareCorners, size: ShareCardSize) => ReactNode;
}) {
  const [slot, setSlot] = useState<ShareCardSize | null>(null);
  const designSize: ShareCardSize = { width: cardWidth, height: cardHeight };
  const fittedSize = fitToSlot && slot ? fitShareCard(slot.width, slot.height) : designSize;
  const previewSize = fittedSize.width > 0 ? fittedSize : designSize;
  // Hold the card back until the slot is measured so it never jumps size.
  const isAwaitingSlot = fitToSlot && slot == null;

  function onSlotLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setSlot((current) =>
      current?.width === width && current.height === height ? current : { width, height },
    );
  }

  return (
    <View
      onLayout={fitToSlot ? onSlotLayout : undefined}
      style={fitToSlot ? styles.slot : styles.root}
      testID="share-capture-slot"
    >
      <View style={isAwaitingSlot ? styles.awaitingSlot : undefined}>
        {children('round', previewSize)}
      </View>
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
        {children('square', designSize)}
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
  slot: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  awaitingSlot: {
    opacity: 0,
  },
  offscreen: {
    position: 'absolute',
    top: 0,
  },
});
