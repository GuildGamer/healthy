import { darkColors, lightColors } from '@product/brand';
import { fireEvent, screen, within } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { useColorScheme } from 'react-native';
import { apiClient } from '@/lib/api';
import { ThemeProvider } from '@/theme';
import { AppearanceScreen } from './AppearanceScreen';
import { SettingsScreen } from './SettingsScreen';
import { meFixture, renderWithProviders } from './testing/settings-fixtures';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  router: { canDismiss: () => false, dismiss: jest.fn(), replace: jest.fn() },
}));

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: { me: jest.fn() },
  apiQuery: {},
}));

jest.mock('@/lib/auth-client', () => ({
  useSession: () => ({ data: { user: { name: 'Nurul Masih', image: null } } }),
}));

const systemScheme = jest.mocked(useColorScheme);

function renderSettings() {
  return renderWithProviders(
    <ThemeProvider>
      <SettingsScreen />
      <AppearanceScreen />
    </ThemeProvider>,
  );
}

describe('Appearance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(apiClient.me).mockResolvedValue(meFixture());
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
    systemScheme.mockReturnValue('light');
  });

  it('shows Auto on a fresh install and switches the theme when a choice is tapped', async () => {
    renderSettings();

    expect(await screen.findByText('Nurul')).toBeOnTheScreen();
    expect(within(screen.getByTestId('open-appearance')).getByText('Auto')).toBeOnTheScreen();
    expect(screen.getByTestId('appearance-auto')).toHaveProp('accessibilityState', {
      selected: true,
    });
    expect(screen.getByTestId('settings-screen')).toHaveStyle({
      backgroundColor: lightColors.background,
    });

    fireEvent.press(screen.getByTestId('appearance-dark'));

    expect(within(screen.getByTestId('open-appearance')).getByText('Dark')).toBeOnTheScreen();
    expect(screen.getByTestId('settings-screen')).toHaveStyle({
      backgroundColor: darkColors.background,
    });
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('appearance_preference', 'dark');

    fireEvent.press(screen.getByTestId('appearance-light'));

    expect(within(screen.getByTestId('open-appearance')).getByText('Light')).toBeOnTheScreen();
    expect(screen.getByTestId('settings-screen')).toHaveStyle({
      backgroundColor: lightColors.background,
    });

    systemScheme.mockReturnValue('dark');
    fireEvent.press(screen.getByTestId('appearance-auto'));

    expect(within(screen.getByTestId('open-appearance')).getByText('Auto')).toBeOnTheScreen();
    expect(screen.getByTestId('settings-screen')).toHaveStyle({
      backgroundColor: darkColors.background,
    });
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('appearance_preference', 'auto');
  });

  it('opens Appearance from the settings row', async () => {
    renderSettings();

    expect(await screen.findByText('Nurul')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('open-appearance'));

    expect(mockPush).toHaveBeenCalledWith('/settings/appearance');
  });
});
