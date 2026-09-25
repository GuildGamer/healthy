import { render, screen } from '@testing-library/react-native';
import { splashOrbitMarks } from './constants/splash-orbit';
import { SplashScreen } from './SplashScreen';

describe('SplashScreen', () => {
  it('leads with the app icon and the Healthy wordmark', () => {
    render(<SplashScreen />);

    expect(screen.getByTestId('splash-screen')).toBeOnTheScreen();
    expect(screen.getByTestId('splash-icon')).toBeOnTheScreen();
    expect(screen.getByText('Healthy')).toBeOnTheScreen();
    expect(screen.queryByText('Turn your health into a game.')).toBeNull();
  });

  it('rings the icon with the onboarding category marks', () => {
    render(<SplashScreen />);

    for (const mark of splashOrbitMarks) {
      expect(screen.getByTestId(`splash-orbit-${mark.id}`)).toBeOnTheScreen();
    }
  });

  it('keeps the constellation on screen while the launch animation runs', () => {
    render(<SplashScreen animate />);

    expect(screen.getByTestId('splash-icon')).toBeOnTheScreen();

    for (const mark of splashOrbitMarks) {
      expect(screen.getByTestId(`splash-orbit-${mark.id}`)).toBeOnTheScreen();
    }
  });
});
