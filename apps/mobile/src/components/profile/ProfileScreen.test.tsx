import { fireEvent, screen } from '@testing-library/react-native';
import { apiClient } from '@/lib/api';
import { ProfileScreen } from './ProfileScreen';
import { meFixture, renderWithProviders } from './testing/settings-fixtures';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: { me: jest.fn() },
  apiQuery: {},
}));

jest.mock('@/lib/auth-client', () => ({
  useSession: () => ({ data: { user: { name: 'Nurul Masih', image: null } } }),
}));

jest.mock('@/components/progress', () => ({
  YouProgress: () => null,
  useRefreshProgress: () => async () => undefined,
}));

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(apiClient.me).mockResolvedValue(meFixture({ displayName: 'Gentle Moth' }));
  });

  it('shows the name others see and opens Profile from it', async () => {
    renderWithProviders(<ProfileScreen />);

    expect(await screen.findByText('Gentle Moth')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('you-open-profile'));

    expect(mockPush).toHaveBeenCalledWith('/settings/profile');
  });

  it('keeps Settings behind the gear', async () => {
    renderWithProviders(<ProfileScreen />);

    fireEvent.press(await screen.findByTestId('open-settings'));

    expect(mockPush).toHaveBeenCalledWith('/settings');
  });
});
