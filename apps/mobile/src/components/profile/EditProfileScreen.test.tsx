import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { apiClient } from '@/lib/api';
import { requestEmailChange, updateUser } from '@/lib/auth-client';
import { pickProfilePhoto } from '@/lib/pick-profile-photo';
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
  requestEmailChange: jest.fn(),
}));

jest.mock('@/lib/pick-profile-photo', () => ({
  pickProfilePhoto: jest.fn(),
  PHOTO_SAVE_FAILED_MESSAGE: 'We could not save that photo. Try again.',
}));

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: mockPush }),
}));

const mockedApi = apiClient as unknown as { me: jest.Mock };
const mockedUpdateUser = updateUser as unknown as jest.Mock;
const mockedRequestEmailChange = requestEmailChange as unknown as jest.Mock;
const mockedPickProfilePhoto = pickProfilePhoto as unknown as jest.Mock;

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
      displayName: 'Ada',
    });
    mockedUpdateUser.mockResolvedValue({ error: null });
    mockedRequestEmailChange.mockResolvedValue({ error: null });
    mockedPickProfilePhoto.mockResolvedValue({ status: 'canceled' });
  });

  it('shows the same initials as the username on profile', async () => {
    const { cleanup } = renderScreen();

    expect(await screen.findByText('A')).toBeOnTheScreen();
    expect(screen.queryByText('AL')).toBeNull();

    await cleanup();
  });

  it('saves a photo picked from the library', async () => {
    mockedPickProfilePhoto.mockResolvedValue({
      status: 'picked',
      image: 'data:image/jpeg;base64,abcd',
    });
    const { cleanup } = renderScreen();

    fireEvent.press(await screen.findByTestId('profile-avatar-edit'));
    fireEvent.press(await screen.findByTestId('change-photo-library'));

    await waitFor(() => {
      expect(mockedPickProfilePhoto).toHaveBeenCalledWith('library');
      expect(mockedUpdateUser).toHaveBeenCalledWith({
        image: 'data:image/jpeg;base64,abcd',
      });
    });

    await cleanup();
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

  it('sends a code when the email changes', async () => {
    const { cleanup } = renderScreen();

    fireEvent.changeText(
      await screen.findByTestId('edit-profile-email'),
      'ada@new.example',
    );
    fireEvent.press(screen.getByTestId('edit-profile-save'));

    await waitFor(() => {
      expect(mockedRequestEmailChange).toHaveBeenCalledWith('ada@new.example');
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/change-email',
      params: { email: 'ada@new.example' },
    });
    expect(mockedUpdateUser).not.toHaveBeenCalled();

    await cleanup();
  });
});
