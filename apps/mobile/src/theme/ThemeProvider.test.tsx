import { darkColors, lightColors } from '@product/brand';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { Pressable, Text, useColorScheme } from 'react-native';
import { ThemeProvider, useAppearancePreference, useTheme } from './ThemeProvider';

function Probe() {
  const { colors, scheme } = useTheme();
  const { preference, setPreference } = useAppearancePreference();

  return (
    <>
      <Text testID="scheme">{scheme}</Text>
      <Text testID="preference">{preference}</Text>
      <Text testID="background">{colors.background}</Text>
      <Pressable onPress={() => setPreference('light')} testID="choose-light" />
      <Pressable onPress={() => setPreference('dark')} testID="choose-dark" />
      <Pressable onPress={() => setPreference('auto')} testID="choose-auto" />
    </>
  );
}

const systemScheme = jest.mocked(useColorScheme);

function renderTheme() {
  return render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    jest.mocked(SecureStore.getItemAsync).mockReset();
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
    jest.mocked(SecureStore.setItemAsync).mockClear();
    systemScheme.mockReturnValue('light');
  });

  it('follows the phone when nothing is stored', () => {
    const view = renderTheme();

    expect(screen.getByTestId('preference')).toHaveTextContent('auto');
    expect(screen.getByTestId('scheme')).toHaveTextContent('light');
    expect(screen.getByTestId('background')).toHaveTextContent(lightColors.background);

    systemScheme.mockReturnValue('dark');
    view.rerender(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('preference')).toHaveTextContent('auto');
    expect(screen.getByTestId('scheme')).toHaveTextContent('dark');
    expect(screen.getByTestId('background')).toHaveTextContent(darkColors.background);
  });

  it('keeps a stored light, dark, or auto choice over the phone', async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue('dark');
    systemScheme.mockReturnValue('light');
    renderTheme();

    await waitFor(() => expect(screen.getByTestId('scheme')).toHaveTextContent('dark'));
    expect(screen.getByTestId('preference')).toHaveTextContent('dark');

    fireEvent.press(screen.getByTestId('choose-light'));
    expect(screen.getByTestId('scheme')).toHaveTextContent('light');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('appearance_preference', 'light');

    fireEvent.press(screen.getByTestId('choose-auto'));
    expect(screen.getByTestId('preference')).toHaveTextContent('auto');
    expect(screen.getByTestId('scheme')).toHaveTextContent('light');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('appearance_preference', 'auto');
  });
});
