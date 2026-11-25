import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text, View } from 'react-native';
import {
  SHARE_POSTER_HEIGHT,
  SHARE_POSTER_RADIUS,
  SHARE_POSTER_WIDTH,
} from '@/components/challenges/SharePosterCard';
import type { ShareCorners } from '@/components/challenges/GymPhotoShareCard';
import { ShareCapture } from './ShareCapture';
import type { ShareCardSize } from './types/share-card-size';

describe('ShareCapture', () => {
  it('parks a sized square card twin off-screen (no Stories letterbox)', () => {
    const shotRef = { current: null as View | null };

    render(
      <ShareCapture shotRef={shotRef}>
        {(corners: ShareCorners) => (
          <View
            style={{
              width: SHARE_POSTER_WIDTH,
              height: SHARE_POSTER_HEIGHT,
              borderRadius: corners === 'round' ? SHARE_POSTER_RADIUS : 0,
            }}
            testID={corners === 'round' ? 'preview' : 'twin'}
          >
            <Text>{corners}</Text>
          </View>
        )}
      </ShareCapture>,
    );

    expect(screen.getByTestId('preview')).toBeOnTheScreen();
    expect(screen.getByText('round')).toBeOnTheScreen();
    expect(screen.queryByTestId('share-social-frame')).toBeNull();

    const twinHost = screen.getByTestId('share-capture-twin', {
      includeHiddenElements: true,
    });
    const twinStyle = StyleSheet.flatten(twinHost.props.style);
    expect(twinStyle.position).toBe('absolute');
    expect(twinStyle.left).toBe(-SHARE_POSTER_WIDTH * 4);
    expect(twinStyle.width).toBe(SHARE_POSTER_WIDTH);
    expect(twinStyle.height).toBe(SHARE_POSTER_HEIGHT);
    expect(twinHost.children.length).toBeGreaterThan(0);
  });

  it('keeps the design size when it does not fit to the slot', () => {
    const sizes: ShareCardSize[] = [];

    render(
      <ShareCapture shotRef={{ current: null }}>
        {(_corners, size) => {
          sizes.push(size);
          return <View />;
        }}
      </ShareCapture>,
    );

    expect(sizes.every((size) => size.width === SHARE_POSTER_WIDTH)).toBe(true);
    expect(sizes.every((size) => size.height === SHARE_POSTER_HEIGHT)).toBe(true);
  });

  describe('fitToSlot', () => {
    function renderFitted(slot: { width: number; height: number }) {
      const previewSizes: ShareCardSize[] = [];
      const twinSizes: ShareCardSize[] = [];
      render(
        <ShareCapture fitToSlot shotRef={{ current: null }}>
          {(corners, size) => {
            (corners === 'round' ? previewSizes : twinSizes).push(size);
            return <View />;
          }}
        </ShareCapture>,
      );
      fireEvent(screen.getByTestId('share-capture-slot'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, ...slot } },
      });
      return { previewSizes, twinSizes };
    }

    it('sizes the preview to the largest 4:5 card the slot allows', () => {
      const { previewSizes } = renderFitted({ width: 342, height: 300 });

      const last = previewSizes[previewSizes.length - 1];
      expect(last).toEqual({ width: 300 * (4 / 5), height: 300 });
    });

    it('fills the slot width when the slot is tall', () => {
      const { previewSizes } = renderFitted({ width: 342, height: 900 });

      expect(previewSizes[previewSizes.length - 1]).toEqual({ width: 342, height: 342 * 1.25 });
    });

    it('never changes the export twin, whatever the slot', () => {
      const { twinSizes } = renderFitted({ width: 200, height: 200 });

      expect(twinSizes.every((size) => size.width === SHARE_POSTER_WIDTH)).toBe(true);
      expect(twinSizes.every((size) => size.height === SHARE_POSTER_HEIGHT)).toBe(true);
    });
  });
});
