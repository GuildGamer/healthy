import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text, View } from 'react-native';
import {
  SHARE_POSTER_HEIGHT,
  SHARE_POSTER_RADIUS,
  SHARE_POSTER_WIDTH,
} from '@/components/challenges/SharePosterCard';
import type { ShareCorners } from '@/components/challenges/GymPhotoShareCard';
import { ShareCapture } from './ShareCapture';

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
});
