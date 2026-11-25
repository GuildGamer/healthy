import { fireEvent, render, screen } from '@testing-library/react-native';
import { Dimensions, StyleSheet, View } from 'react-native';
import { SetSharePager } from './SetSharePager';

jest.mock('@/components/matches/share-destination', () => ({
  openShareDestination: jest.fn(async () => undefined),
}));

const poster = {
  kind: 'strength' as const,
  label: 'Do 20 push-ups',
  value: '22',
  unit: 'push-ups',
  when: '2026-10-20T09:15:00.000Z',
};

const clip = {
  playUri: 'file:///clip.mp4',
  shareUri: 'file:///clip.mp4',
};

/** Fallback page width the pager uses until the slot has laid out. */
const PAGE_WIDTH = Dimensions.get('window').width - 48;

function renderPager(extras: { withClip: boolean }) {
  return render(
    <SetSharePager
      caption="caption"
      clip={extras.withClip ? clip : null}
      fillId="strength"
      onSelectFill={jest.fn()}
      poster={poster}
      renderVideo={() => <View testID="clip-video" />}
      runLine={null}
    />,
  );
}

function colourRow() {
  return screen.getByTestId('share-colour-row', { includeHiddenElements: true });
}

function colourRowOpacity(): number {
  const flattened = StyleSheet.flatten(colourRow().props.style);
  return Number(flattened.opacity);
}

function scrollTo(offsetX: number) {
  fireEvent.scroll(screen.getByTestId('clip-finish-list'), {
    nativeEvent: {
      contentOffset: { x: offsetX, y: 0 },
      contentSize: { width: PAGE_WIDTH * 2, height: 600 },
      layoutMeasurement: { width: PAGE_WIDTH, height: 600 },
    },
  });
}

function settleAt(offsetX: number) {
  fireEvent(screen.getByTestId('clip-finish-list'), 'momentumScrollEnd', {
    nativeEvent: { contentOffset: { x: offsetX, y: 0 } },
  });
}

describe('SetSharePager colour row', () => {
  it('is already laid out on the video page, but invisible and out of reach', () => {
    renderPager({ withClip: true });

    expect(colourRow()).toBeTruthy();
    expect(colourRowOpacity()).toBe(0);
    expect(colourRow().props.pointerEvents).toBe('none');
    expect(screen.queryByTestId('share-fill-carousel')).toBeNull();
  });

  it('stays hidden through the first half of the swipe, then fades in as the card arrives', () => {
    renderPager({ withClip: true });

    scrollTo(PAGE_WIDTH * 0.25);
    expect(colourRowOpacity()).toBe(0);

    scrollTo(PAGE_WIDTH * 0.5);
    expect(colourRowOpacity()).toBe(0);

    scrollTo(PAGE_WIDTH * 0.75);
    expect(colourRowOpacity()).toBeCloseTo(0.5);

    scrollTo(PAGE_WIDTH);
    expect(colourRowOpacity()).toBe(1);
  });

  it('fades back out on the way to the video', () => {
    renderPager({ withClip: true });
    scrollTo(PAGE_WIDTH);
    settleAt(PAGE_WIDTH);

    scrollTo(PAGE_WIDTH * 0.75);
    expect(colourRowOpacity()).toBeCloseTo(0.5);

    scrollTo(PAGE_WIDTH * 0.25);
    expect(colourRowOpacity()).toBe(0);
  });

  it('only takes taps once the card has settled in front, and lets go when you leave it', () => {
    renderPager({ withClip: true });

    scrollTo(PAGE_WIDTH * 0.75);
    expect(colourRow().props.pointerEvents).toBe('none');

    scrollTo(PAGE_WIDTH);
    settleAt(PAGE_WIDTH);
    expect(colourRow().props.pointerEvents).toBe('auto');
    expect(screen.getByTestId('share-fill-carousel')).toBeOnTheScreen();

    scrollTo(0);
    settleAt(0);
    expect(colourRow().props.pointerEvents).toBe('none');
    expect(screen.queryByTestId('share-fill-carousel')).toBeNull();
  });

  it('is simply there when the card is the only page', () => {
    renderPager({ withClip: false });

    expect(colourRowOpacity()).toBe(1);
    expect(colourRow().props.pointerEvents).toBe('auto');
    expect(screen.getByTestId('share-fill-carousel')).toBeOnTheScreen();
  });
});
