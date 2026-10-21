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
const mockDismiss = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => callback(),
  useRouter: () => ({
    push: (href: string) => mockPush(href),
  }),
  router: {
    canDismiss: () => true,
    back: () => mockBack(),
    dismiss: () => mockDismiss(),
    replace: (href: string) => mockReplace(href),
  },
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
  mockDismiss.mockClear();
  mockReplace.mockClear();
  mockPush.mockClear();
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
    expect(mockDismiss).toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();

    await cleanup();
  });

  it('opens the match board when a social row has a match payload', async () => {
    mockedApi.listNotifications.mockResolvedValue(
      inbox({
        notifications: [
          {
            id: 'n-board',
            kind: 'social',
            title: 'See the board',
            body: 'Quiet Falcon just scored.',
            isRead: true,
            createdAt: '2026-08-29T10:00:00.000Z',
            payload: { matchId: 'm1' },
          },
        ],
      }),
    );

    const { cleanup } = renderInbox();

    fireEvent.press(await screen.findByTestId('notification-open-n-board'));
    expect(mockPush).toHaveBeenCalledWith('/matches/m1');

    await cleanup();
  });

  it('does not offer a tap target when the payload is missing', async () => {
    mockedApi.listNotifications.mockResolvedValue(
      inbox({
        notifications: [
          {
            id: 'n-old',
            kind: 'reminder',
            title: 'Do one now',
            body: 'One challenge still open',
            isRead: true,
            createdAt: '2026-08-29T10:00:00.000Z',
            payload: null,
          },
        ],
      }),
    );

    const { cleanup } = renderInbox();

    expect(await screen.findByText('Do one now')).toBeOnTheScreen();
    expect(screen.queryByTestId('notification-open-n-old')).toBeNull();

    await cleanup();
  });
});
