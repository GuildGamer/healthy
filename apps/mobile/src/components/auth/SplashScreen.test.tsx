import { render, screen } from '@testing-library/react-native';
import { SplashScreen } from './SplashScreen';

describe('SplashScreen', () => {
  it('leads with the app icon and the Healthy wordmark', () => {
    render(<SplashScreen />);

    expect(screen.getByTestId('splash-screen')).toBeOnTheScreen();
    expect(screen.getByTestId('splash-icon')).toBeOnTheScreen();
    expect(screen.getByText('Healthy')).toBeOnTheScreen();
    expect(screen.queryByText('Turn your health into a game.')).toBeNull();
  });
});
