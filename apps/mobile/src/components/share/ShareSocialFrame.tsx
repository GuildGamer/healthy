import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  SHARE_STORIES_FRAME_HEIGHT,
  SHARE_STORIES_FRAME_WIDTH,
  SHARE_STORIES_SAFE_BOTTOM,
  SHARE_STORIES_SAFE_SIDE,
  SHARE_STORIES_SAFE_TOP,
} from '@/lib/share-export';

/**
 * 9:16 export canvas for Instagram Stories / Status. The share card sits inside
 * Meta's safe zone on a night background so the app chrome does not cover type
 * and Instagram does not zoom-crop a short portrait into the full frame.
 */
export function ShareSocialFrame({
  cardWidth,
  cardHeight,
  children,
  testID = 'share-social-frame',
}: {
  cardWidth: number;
  cardHeight: number;
  children: ReactNode;
  testID?: string;
}) {
  const sidePad = SHARE_STORIES_FRAME_WIDTH * SHARE_STORIES_SAFE_SIDE;
  const topPad = SHARE_STORIES_FRAME_HEIGHT * SHARE_STORIES_SAFE_TOP;
  const bottomPad = SHARE_STORIES_FRAME_HEIGHT * SHARE_STORIES_SAFE_BOTTOM;
  const safeWidth = SHARE_STORIES_FRAME_WIDTH - sidePad * 2;
  const safeHeight = SHARE_STORIES_FRAME_HEIGHT - topPad - bottomPad;
  const scale = Math.min(safeWidth / cardWidth, safeHeight / cardHeight);
  const scaledWidth = cardWidth * scale;
  const scaledHeight = cardHeight * scale;

  return (
    <View
      collapsable={false}
      style={styles.frame}
      testID={testID}
    >
      <View
        style={[
          styles.safe,
          {
            paddingTop: topPad,
            paddingBottom: bottomPad,
            paddingHorizontal: sidePad,
          },
        ]}
      >
        <View style={{ width: scaledWidth, height: scaledHeight, overflow: 'hidden' }}>
          <View
            collapsable={false}
            style={{
              position: 'absolute',
              left: (scaledWidth - cardWidth) / 2,
              top: (scaledHeight - cardHeight) / 2,
              width: cardWidth,
              height: cardHeight,
              transform: [{ scale }],
            }}
          >
            {children}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: SHARE_STORIES_FRAME_WIDTH,
    height: SHARE_STORIES_FRAME_HEIGHT,
    backgroundColor: '#0B1220',
    overflow: 'hidden',
  },
  safe: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
});
