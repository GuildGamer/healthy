import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { apiClient } from '@/lib/api';
import { updateUser } from '@/lib/auth-client';
import { EditProfileScreen } from './EditProfileScreen';

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: { me: jest.fn() },
  apiQuery: {},
}));

jest.mock('@/lib/auth-client', () => ({
  useSession: () => ({
    data: { user: { name: 'Ada Lovelace', email: 'ada@example.com' } },
  }),
  updateUser: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
}));

const mockedApi = apiClient as unknown as { me: jest.Mock };
const mockedUpdateUser = updateUser as unknown as jest.Mock;

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });

  function wrap(ui: ReactElement) {
    return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
  }

  const view = render(wrap(<EditProfileScreen />));

  return {
    cleanup: async () => {
      await waitFor(() => {
        expect(client.isFetching()).toBe(0);
      });
      view.unmount();
      client.clear();
    },
  };
}

describe('EditProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.me.mockResolvedValue({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    });
    mockedUpdateUser.mockResolvedValue({ error: null });
  });

  it('saves a new full name', async () => {
    const { cleanup } = renderScreen();

    fireEvent.changeText(
      await screen.findByTestId('edit-profile-name'),
      'Ada L',
    );
    fireEvent.press(screen.getByTestId('edit-profile-save'));

    await waitFor(() => {
      expect(mockedUpdateUser).toHaveBeenCalledWith({ name: 'Ada L' });
    });
    expect(await screen.findByTestId('edit-profile-saved')).toBeOnTheScreen();

    await cleanup();
  });

  it('shows email as read-only', async () => {
    const { cleanup } = renderScreen();

    expect(await screen.findByTestId('edit-profile-email')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('ada@example.com')).toBeOnTheScreen();

    await cleanup();
  });
});
