import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
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
});
