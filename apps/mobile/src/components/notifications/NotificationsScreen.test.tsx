import type { ListNotificationsOutput } from '@product/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { apiClient } from '@/lib/api';
import { NotificationsScreen } from './NotificationsScreen';

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    listNotifications: jest.fn(),
    markNotificationsRead: jest.fn(),
  },
  apiQuery: {},
}));

const mockBack = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => callback(),
  useRouter: () => ({
    canGoBack: () => true,
    back: mockBack,
    replace: mockReplace,
  }),
}));

const mockedApi = apiClient as unknown as {
  listNotifications: jest.Mock;
  markNotificationsRead: jest.Mock;
};

function inbox(
  overrides: Partial<ListNotificationsOutput> = {},
): ListNotificationsOutput {
  return {
    notifications: [],
    unreadCount: 0,
    ...overrides,
  };
}

function renderInbox() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  const view = render(
    <QueryClientProvider client={client}>
      <NotificationsScreen />
    </QueryClientProvider>,
  );

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

beforeEach(() => {
  jest.clearAllMocks();
  mockBack.mockClear();
  mockReplace.mockClear();
  mockedApi.markNotificationsRead.mockResolvedValue({ unreadCount: 0 });
});

describe('NotificationsScreen', () => {
  it('shows the empty state when the inbox is empty', async () => {
    mockedApi.listNotifications.mockResolvedValue(inbox());
    const { cleanup } = renderInbox();

    expect(await screen.findByTestId('notifications-empty')).toBeOnTheScreen();
    expect(screen.getByText('No notifications')).toBeOnTheScreen();

    await cleanup();
  });

  it('renders unread rows and marks them read when opened', async () => {
    mockedApi.listNotifications.mockResolvedValue(
      inbox({
        unreadCount: 1,
        notifications: [
          {
            id: 'n1',
            kind: 'success',
            title: 'Challenge completed',
            body: 'You earned 20 points for a walk.',
            isRead: false,
            createdAt: '2026-08-29T10:00:00.000Z',
          },
        ],
      }),
    );

    const { cleanup } = renderInbox();

    expect(await screen.findByText('Challenge completed')).toBeOnTheScreen();
    expect(screen.getByText(/earned 20 points/)).toBeOnTheScreen();
    await waitFor(() => {
      expect(mockedApi.markNotificationsRead).toHaveBeenCalled();
    });

    await cleanup();
  });

  it('goes back from the in-screen header', async () => {
    mockedApi.listNotifications.mockResolvedValue(inbox());
    const { cleanup } = renderInbox();

    fireEvent.press(await screen.findByTestId('notifications-back'));
    expect(mockBack).toHaveBeenCalled();

    await cleanup();
  });
});
