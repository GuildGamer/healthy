import { darkColors, darkDeckCards, lightColors, lightDeckCards } from '@product/brand';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet, useColorScheme } from 'react-native';
import { ThemeProvider } from '@/theme';
import { SplashScreen } from './SplashScreen';

function colorOf(testID: string, key: 'backgroundColor' | 'color'): unknown {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style)[key];
}

describe('SplashScreen appearance', () => {
  beforeEach(() => {
    jest.mocked(useColorScheme).mockReturnValue('light');
  });

  it('uses Clinic white, dark wordmark, and light deck cards when the phone is light', () => {
    render(
      <ThemeProvider>
        <SplashScreen hasNativeSplashHidden={false} isReady={false} onExited={jest.fn()} />
      </ThemeProvider>,
    );

    expect(colorOf('splash-screen', 'backgroundColor')).toBe(lightColors.background);
    expect(StyleSheet.flatten(screen.getByText('Healthy').props.style).color).toBe(
      lightColors.text,
    );
    expect(colorOf('splash-fan-strength', 'backgroundColor')).toBe(lightDeckCards.strength);
    expect(colorOf('splash-fan-mobility', 'backgroundColor')).toBe(lightDeckCards.mobility);
    expect(colorOf('splash-fan-gym', 'backgroundColor')).toBe(lightDeckCards.gym);
    expect(screen.getByTestId('splash-icon')).toBeOnTheScreen();
  });

  it('uses Healthy night, light wordmark, and dark deck cards when the phone is dark', () => {
    jest.mocked(useColorScheme).mockReturnValue('dark');

    render(
      <ThemeProvider>
        <SplashScreen hasNativeSplashHidden={false} isReady={false} onExited={jest.fn()} />
      </ThemeProvider>,
    );

    expect(colorOf('splash-screen', 'backgroundColor')).toBe(darkColors.background);
    expect(StyleSheet.flatten(screen.getByText('Healthy').props.style).color).toBe(darkColors.text);
    expect(colorOf('splash-fan-strength', 'backgroundColor')).toBe(darkDeckCards.strength);
    expect(colorOf('splash-fan-mobility', 'backgroundColor')).toBe(darkDeckCards.mobility);
    expect(colorOf('splash-fan-gym', 'backgroundColor')).toBe(darkDeckCards.gym);
  });
});
