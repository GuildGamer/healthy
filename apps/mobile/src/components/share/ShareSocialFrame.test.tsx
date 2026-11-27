import { render, screen } from '@testing-library/react-native';
import { StyleSheet, View } from 'react-native';
import {
  SHARE_STORIES_FRAME_HEIGHT,
  SHARE_STORIES_FRAME_WIDTH,
} from '@/lib/share-export';
import { ShareSocialFrame } from './ShareSocialFrame';

describe('ShareSocialFrame', () => {
  it('is a 9:16 night canvas for the export twin', () => {
    render(
      <ShareSocialFrame cardHeight={400} cardWidth={300}>
        <View testID="card" />
      </ShareSocialFrame>,
    );

    const frame = StyleSheet.flatten(screen.getByTestId('share-social-frame').props.style);
    expect(frame.width).toBe(SHARE_STORIES_FRAME_WIDTH);
    expect(frame.height).toBe(SHARE_STORIES_FRAME_HEIGHT);
    expect(frame.width / frame.height).toBeCloseTo(9 / 16);
    expect(frame.backgroundColor).toBe('#0B1220');
    expect(screen.getByTestId('card')).toBeTruthy();
  });
});
