import { act, render, screen } from '@testing-library/react-native';
import { RefreshControl, Text } from 'react-native';
import { RefreshableScroll } from './RefreshableScroll';

describe('RefreshableScroll', () => {
  it('renders its children', () => {
    render(
      <RefreshableScroll onPullRefresh={async () => undefined}>
        <Text>Today</Text>
      </RefreshableScroll>,
    );

    expect(screen.getByText('Today')).toBeOnTheScreen();
    expect(screen.queryByTestId('pull-refresh-loader')).toBeNull();
  });

  it('does not mount an overlay loader while refreshing', async () => {
    let finishRefresh: (() => void) | undefined;
    const onPullRefresh = () =>
      new Promise<void>((resolve) => {
        finishRefresh = resolve;
      });

    const view = render(
      <RefreshableScroll onPullRefresh={onPullRefresh}>
        <Text>Challenges</Text>
      </RefreshableScroll>,
    );

    const refreshControl = view.UNSAFE_getByType(RefreshControl);
    await act(async () => {
      refreshControl.props.onRefresh?.();
    });

    expect(screen.queryByTestId('pull-refresh-loader')).toBeNull();
    expect(screen.getByText('Challenges')).toBeOnTheScreen();

    await act(async () => {
      finishRefresh?.();
    });
  });
});
