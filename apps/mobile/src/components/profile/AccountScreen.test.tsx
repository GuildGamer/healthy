import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { apiClient } from '@/lib/api';
import { hasPasswordSignIn, signOut } from '@/lib/auth-client';
import { AccountScreen } from './AccountScreen';
import { meFixture, renderWithProviders } from './testing/settings-fixtures';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  router: { canDismiss: () => true, dismiss: jest.fn(), replace: jest.fn() },
}));

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: { me: jest.fn(), updateCountry: jest.fn() },
  apiQuery: {},
}));

jest.mock('@/lib/auth-client', () => ({
  useSession: () => ({ data: { user: { email: 'nurul@example.com' } } }),
  hasPasswordSignIn: jest.fn(async () => true),
  signOut: jest.fn(async () => undefined),
}));

describe('AccountScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(apiClient.me).mockResolvedValue(meFixture());
  });

  it('shows sign-in details with the country it prices in', async () => {
    renderWithProviders(<AccountScreen />);

    expect(await screen.findByText('nurul@example.com')).toBeOnTheScreen();
    expect(await screen.findByText('Nigeria')).toBeOnTheScreen();
    expect(await screen.findByTestId('open-change-password')).toBeOnTheScreen();
  });

  it('hides Password for an account that only signs in with Google', async () => {
    jest.mocked(hasPasswordSignIn).mockResolvedValueOnce(false);
    renderWithProviders(<AccountScreen />);

    expect(await screen.findByText('nurul@example.com')).toBeOnTheScreen();
    await waitFor(() => expect(hasPasswordSignIn).toHaveBeenCalled());
    expect(screen.queryByTestId('open-change-password')).toBeNull();
  });

  it('asks once before signing out', async () => {
    renderWithProviders(<AccountScreen />);

    fireEvent.press(await screen.findByTestId('profile-sign-out'));
    expect(signOut).not.toHaveBeenCalled();
    expect(screen.getByText('Sign out of Healthy?')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('confirm-sign-out'));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('opens the delete page from the red link under Sign out', async () => {
    renderWithProviders(<AccountScreen />);

    fireEvent.press(await screen.findByTestId('open-delete-account'));
    expect(mockPush).toHaveBeenCalledWith('/settings/delete-account');
  });
});
