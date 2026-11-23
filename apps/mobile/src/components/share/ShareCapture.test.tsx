import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text, View } from 'react-native';
import { SHARE_POSTER_RADIUS } from '@/components/challenges/SharePosterCard';
import type { ShareCorners } from '@/components/challenges/GymPhotoShareCard';
import { ShareCapture } from './ShareCapture';

describe('ShareCapture', () => {
  it('keeps the square twin off-screen so only the rounded preview shows', () => {
    const shotRef = { current: null as View | null };

    render(
      <ShareCapture shotRef={shotRef}>
        {(corners: ShareCorners) => (
          <View
            style={{
              width: 100,
              height: 100,
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

    const twinHost = screen.getByTestId('share-capture-twin', {
      includeHiddenElements: true,
    });
    const twinStyle = StyleSheet.flatten(twinHost.props.style);
    expect(twinStyle.position).toBe('absolute');
    expect(twinStyle.transform).toBeDefined();
    expect(twinHost.children.length).toBeGreaterThan(0);
  });
});
