import { render, screen } from '@testing-library/react-native';
import { ScreenLoader } from './ScreenLoader';

describe('ScreenLoader', () => {
  it('fills the screen with the brand loader', () => {
    render(<ScreenLoader />);

    expect(screen.getByTestId('screen-loader')).toBeOnTheScreen();
  });

  it('keeps a screen-specific test id when one is passed', () => {
    render(<ScreenLoader testID="leaderboard-loading" />);

    expect(screen.getByTestId('leaderboard-loading')).toBeOnTheScreen();
  });
});
