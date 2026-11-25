import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text, View } from 'react-native';
import {
  SHARE_POSTER_HEIGHT,
  SHARE_POSTER_RADIUS,
  SHARE_POSTER_WIDTH,
} from '@/components/challenges/SharePosterCard';
import type { ShareCorners } from '@/components/challenges/GymPhotoShareCard';
import {
  SHARE_STORIES_FRAME_HEIGHT,
  SHARE_STORIES_FRAME_WIDTH,
} from '@/lib/share-export';
import { ShareCapture } from './ShareCapture';

describe('ShareCapture', () => {
  it('parks a sized 9:16 social twin off-screen', () => {
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
    expect(screen.getByTestId('share-social-frame', { includeHiddenElements: true })).toBeTruthy();

    const twinHost = screen.getByTestId('share-capture-twin', {
      includeHiddenElements: true,
    });
    const twinStyle = StyleSheet.flatten(twinHost.props.style);
    expect(twinStyle.position).toBe('absolute');
    expect(twinStyle.left).toBe(-SHARE_STORIES_FRAME_WIDTH * 4);
    expect(twinStyle.width).toBe(SHARE_STORIES_FRAME_WIDTH);
    expect(twinStyle.height).toBe(SHARE_STORIES_FRAME_HEIGHT);
    expect(twinHost.children.length).toBeGreaterThan(0);
  });
});
