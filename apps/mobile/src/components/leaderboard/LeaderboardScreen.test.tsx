import type { ListLeaderboardOutput, MeOutput } from '@product/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Metrics } from 'react-native-safe-area-context';
import { apiClient } from '@/lib/api';
import { LeaderboardScreen } from './LeaderboardScreen';

const testSafeAreaMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: { listLeaderboard: jest.fn(), me: jest.fn(), updateNotificationSettings: jest.fn() },
  apiQuery: {},
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  router: { canDismiss: () => true, dismiss: jest.fn(), replace: jest.fn() },
}));

const mockedApi = apiClient as unknown as {
  listLeaderboard: jest.Mock;
  me: jest.Mock;
  updateNotificationSettings: jest.Mock;
};

function me(overrides: Partial<MeOutput> = {}): MeOutput {
  return {
    id: 'u1',
    email: 'ada@example.com',
    name: 'Ada Lovelace',
    categories: ['hypertension'],
    pointsBalance: 60,
    currentStreakDays: 3,
    streakLapsedYesterday: false,
    bestStreakDays: 3,
    timeZone: 'UTC',
    countryCode: 'US',
    displayName: 'Kind Finch',
    reminderEnabled: false,
    reminderMinute: 1140,
    evidenceRemindersEnabled: true,
    promotionalMessagesEnabled: false,
    showOnLeaderboard: true,
    inProgressNudgeEnabled: true,
    inProgressNudgeDelayMinutes: 30,
    groupNotificationsEnabled: true,
    healthLinkStatus: 'unknown',
    hasMembership: false,
    maxRemindersPerChallenge: 1,
    ...overrides,
  };
}

const TOP = [
  { rank: 1, displayName: 'Amber Fox', points: 6450, isCurrentUser: false },
  { rank: 2, displayName: 'Quiet Otter', points: 6100, isCurrentUser: false },
  { rank: 3, displayName: 'Teal Heron', points: 5980, isCurrentUser: false },
  { rank: 4, displayName: 'Brisk Lark', points: 5700, isCurrentUser: false },
  { rank: 5, displayName: 'Calm Pike', points: 5650, isCurrentUser: false },
  { rank: 6, displayName: 'Bright Wren', points: 5400, isCurrentUser: false },
];

function board(overrides: Partial<ListLeaderboardOutput> = {}): ListLeaderboardOutput {
  return {
    weekStart: '2026-10-19',
    period: 'week',
    periodStart: '2026-10-19',
    entries: TOP,
    currentUserRank: 38,
    currentUserRankAtDayStart: 38,
    currentUserPoints: 1750,
    currentUserVisible: true,
    aroundCurrentUser: [
      { rank: 36, displayName: 'Brave Ibis', points: 1820, isCurrentUser: false },
      { rank: 37, displayName: 'Gentle Moth', points: 1790, isCurrentUser: false },
      { rank: 38, displayName: 'Kind Finch', points: 1750, isCurrentUser: true },
      { rank: 39, displayName: 'Steady Crane', points: 1700, isCurrentUser: false },
      { rank: 40, displayName: 'Bold Newt', points: 1680, isCurrentUser: false },
    ],
    ...overrides,
  };
}

function renderLeaderboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

  const view = render(
    <QueryClientProvider client={client}>
      <SafeAreaProvider initialMetrics={testSafeAreaMetrics}>
        <LeaderboardScreen />
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
  mockedApi.me.mockResolvedValue(me());
});

describe('LeaderboardScreen', () => {
  it('leads with your place and the next person to pass, then the top and your neighbours', async () => {
    mockedApi.listLeaderboard.mockResolvedValue(board());
    const { cleanup } = renderLeaderboard();

    expect(await screen.findByText('38th')).toBeOnTheScreen();
    expect(screen.getByText('41 points to pass Gentle Moth. Resets Monday.')).toBeOnTheScreen();
    expect(screen.getByTestId('leaderboard-row-3')).toBeOnTheScreen();
    expect(screen.queryByTestId('leaderboard-row-4')).toBeNull();
    expect(
      screen.getByTestId('leaderboard-gap', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('leaderboard-row-38')).toHaveTextContent(/You/);
    expect(screen.queryByText('Kind Finch')).toBeNull();
    expect(mockedApi.listLeaderboard).toHaveBeenCalledWith({ period: 'week' });

    await cleanup();
  });

  it('asks for a first challenge before you have a place', async () => {
    mockedApi.listLeaderboard.mockResolvedValue(
      board({ currentUserRank: null, currentUserPoints: 0, aroundCurrentUser: [] }),
    );
    const { cleanup } = renderLeaderboard();

    expect(await screen.findByText('Not yet')).toBeOnTheScreen();
    expect(screen.getByText('Finish one challenge to join this week’s board.')).toBeOnTheScreen();

    await cleanup();
  });

  it('says you are hidden and turns the board back on in one tap', async () => {
    mockedApi.me.mockResolvedValue(me({ showOnLeaderboard: false }));
    mockedApi.listLeaderboard.mockResolvedValue(
      board({ currentUserVisible: false, currentUserRank: null, aroundCurrentUser: [] }),
    );
    mockedApi.updateNotificationSettings.mockResolvedValue(me({ showOnLeaderboard: true }));
    const { cleanup } = renderLeaderboard();

    expect(await screen.findByText('Hidden')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('leaderboard-show-me'));

    await waitFor(() =>
      expect(mockedApi.updateNotificationSettings).toHaveBeenCalledWith(
        expect.objectContaining({ showOnLeaderboard: true, evidenceRemindersEnabled: true }),
      ),
    );

    await cleanup();
  });

  it('explains the board, naming you as others see you', async () => {
    mockedApi.listLeaderboard.mockResolvedValue(board());
    const { cleanup } = renderLeaderboard();

    fireEvent.press(await screen.findByTestId('leaderboard-help'));

    expect(
      await screen.findByText('Others see you as “Kind Finch” and your points.'),
    ).toBeOnTheScreen();

    await cleanup();
  });

  it('offers a retry when the board does not load', async () => {
    mockedApi.listLeaderboard.mockRejectedValue(new Error('offline'));
    const { cleanup } = renderLeaderboard();

    expect(await screen.findByTestId('leaderboard-error')).toBeOnTheScreen();

    await cleanup();
  });
});
