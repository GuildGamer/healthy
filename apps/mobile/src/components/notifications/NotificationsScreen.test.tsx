import type { InboxNotification, ListNotificationsOutput, TodayChallenge } from '@product/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Metrics } from 'react-native-safe-area-context';
import { apiClient } from '@/lib/api';
import { NotificationsScreen } from './NotificationsScreen';

const testSafeAreaMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    listNotifications: jest.fn(),
    markNotificationsRead: jest.fn(),
    listTodayChallenges: jest.fn(),
  },
  apiQuery: {},
}));

const mockDismiss = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => callback(),
  useRouter: () => ({ push: (href: unknown) => mockPush(href) }),
  router: {
    canDismiss: () => true,
    back: jest.fn(),
    dismiss: () => mockDismiss(),
    replace: jest.fn(),
  },
}));

const mockedApi = apiClient as unknown as {
  listNotifications: jest.Mock;
  markNotificationsRead: jest.Mock;
  listTodayChallenges: jest.Mock;
};

function note(overrides: Partial<InboxNotification>): InboxNotification {
  return {
    id: 'n1',
    kind: 'reminder',
    title: 'Blood pressure reminder',
    body: 'Time for your morning reading.',
    isRead: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function inbox(notifications: InboxNotification[]): ListNotificationsOutput {
  return {
    notifications,
    unreadCount: notifications.filter((item) => !item.isRead).length,
  };
}

function gymWithOpenPhotoCheck(): TodayChallenge {
  return {
    id: 'uc-gym',
    challengeId: 'gym',
    title: 'Gym session',
    category: 'general',
    completionKind: 'evidence_photo',
    capture: {
      kind: 'photo',
      metric: null,
      target: { durationMinutes: null, distanceMeters: null, count: null },
    },
    evidenceRequest: {
      expiresAt: new Date(Date.now() + 8 * 60_000).toISOString(),
      windowSeconds: 600,
      penaltyPoints: 100,
    },
  } as TodayChallenge;
}

function renderInbox() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = render(
    <QueryClientProvider client={client}>
      <SafeAreaProvider initialMetrics={testSafeAreaMetrics}>
        <NotificationsScreen />
      </SafeAreaProvider>
    </QueryClientProvider>,
  );

  return {
    cleanup: async () => {
      await waitFor(() => expect(client.isFetching()).toBe(0));
      view.unmount();
      client.clear();
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedApi.markNotificationsRead.mockResolvedValue({ unreadCount: 0 });
  mockedApi.listTodayChallenges.mockResolvedValue({
    dayKey: '2026-10-22',
    challenges: [],
    completedCount: 0,
    totalCount: 0,
  });
});

describe('NotificationsScreen', () => {
  it('says what will arrive here when there is nothing yet', async () => {
    mockedApi.listNotifications.mockResolvedValue(inbox([]));
    const { cleanup } = renderInbox();

    expect(await screen.findByTestId('notifications-empty')).toBeOnTheScreen();
    expect(screen.getByText('Nothing yet')).toBeOnTheScreen();

    await cleanup();
  });

  it('groups rows under Today and Earlier and marks unread ones read', async () => {
    mockedApi.listNotifications.mockResolvedValue(
      inbox([
        note({ id: 'cheer', title: 'Ada cheered you', isRead: false }),
        note({ id: 'ended', title: 'Walking group ended', createdAt: '2026-08-29T10:00:00.000Z' }),
      ]),
    );
    const { cleanup } = renderInbox();

    expect(await screen.findByText('Ada cheered you')).toBeOnTheScreen();
    expect(screen.getByText('TODAY')).toBeOnTheScreen();
    expect(screen.getByText('EARLIER')).toBeOnTheScreen();
    await waitFor(() => expect(mockedApi.markNotificationsRead).toHaveBeenCalled());

    await cleanup();
  });

  it('pins an open photo check on top with one button to the camera', async () => {
    mockedApi.listNotifications.mockResolvedValue(inbox([]));
    mockedApi.listTodayChallenges.mockResolvedValue({
      dayKey: '2026-10-22',
      challenges: [gymWithOpenPhotoCheck()],
      completedCount: 0,
      totalCount: 1,
    });
    const { cleanup } = renderInbox();

    fireEvent.press(await screen.findByTestId('inbox-open-camera-uc-gym'));
    expect(mockPush).toHaveBeenCalledWith('/challenge/gym/verify');

    await cleanup();
  });

  it('opens the day in History from a missed photo check', async () => {
    const createdAt = new Date(2026, 9, 20, 18, 40).toISOString();
    mockedApi.listNotifications.mockResolvedValue(
      inbox([note({ id: 'missed', kind: 'penalty', title: 'Photo check missed', createdAt })]),
    );
    const { cleanup } = renderInbox();

    fireEvent.press(await screen.findByTestId('notification-open-missed'));
    expect(mockPush).toHaveBeenCalledWith('/history/2026-10-20');

    await cleanup();
  });

  it('opens the match board when a social row has a match payload', async () => {
    mockedApi.listNotifications.mockResolvedValue(
      inbox([
        note({ id: 'board', kind: 'social', title: 'See the board', payload: { matchId: 'm1' } }),
      ]),
    );
    const { cleanup } = renderInbox();

    fireEvent.press(await screen.findByTestId('notification-open-board'));
    expect(mockPush).toHaveBeenCalledWith('/matches/m1');

    await cleanup();
  });

  it('does not offer a tap target when a reminder has nowhere to go', async () => {
    mockedApi.listNotifications.mockResolvedValue(inbox([note({ id: 'old', payload: null })]));
    const { cleanup } = renderInbox();

    expect(await screen.findByTestId('notification-old')).toBeOnTheScreen();
    expect(screen.queryByTestId('notification-open-old')).toBeNull();

    await cleanup();
  });

  it('goes back from the page header', async () => {
    mockedApi.listNotifications.mockResolvedValue(inbox([]));
    const { cleanup } = renderInbox();

    fireEvent.press(await screen.findByTestId('page-back'));
    expect(mockDismiss).toHaveBeenCalled();

    await cleanup();
  });
});
