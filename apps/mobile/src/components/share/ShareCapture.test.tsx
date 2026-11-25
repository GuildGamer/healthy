import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text, View } from 'react-native';
import { SHARE_POSTER_RADIUS, SHARE_POSTER_WIDTH } from '@/components/challenges/SharePosterCard';
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
    expect(twinStyle.left).toBe(-SHARE_POSTER_WIDTH * 4);
    expect(twinStyle.overflow).toBeUndefined();
    expect(twinHost.children.length).toBeGreaterThan(0);
  });

  it('parks the twin by the given capture width', () => {
    const shotRef = { current: null as View | null };

    render(
      <ShareCapture captureWidth={320} shotRef={shotRef}>
        {(corners: ShareCorners) => (
          <View testID={corners === 'round' ? 'preview' : 'twin'} />
        )}
      </ShareCapture>,
    );

    const twinStyle = StyleSheet.flatten(
      screen.getByTestId('share-capture-twin', { includeHiddenElements: true }).props.style,
    );
    expect(twinStyle.left).toBe(-320 * 4);
    expect(twinStyle.width).toBe(320);
  });
});
