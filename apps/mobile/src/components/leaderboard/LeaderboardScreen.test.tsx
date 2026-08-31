import type { ListLeaderboardOutput, MeOutput } from '@product/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { apiClient } from '@/lib/api';
import { LeaderboardScreen } from './LeaderboardScreen';

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: { listLeaderboard: jest.fn(), me: jest.fn() },
  apiQuery: {},
}));

jest.mock('expo-router', () => {
  const push = jest.fn();
  return {
    useRouter: () => ({ push }),
  };
});

const mockedApi = apiClient as unknown as {
  listLeaderboard: jest.Mock;
  me: jest.Mock;
};

function me(overrides: Partial<MeOutput> = {}): MeOutput {
  return {
    id: 'u1',
    email: 'ada@example.com',
    name: 'Ada Lovelace',
    categories: ['hypertension'],
    pointsBalance: 60,
    currentStreakDays: 3,
    timeZone: 'UTC',
    countryCode: 'US',
    displayName: 'Ada',
    reminderEnabled: false,
    reminderMinute: 1140,
    evidenceRemindersEnabled: true,
    promotionalMessagesEnabled: false,
    showOnLeaderboard: true,
    inProgressNudgeEnabled: true,
    inProgressNudgeDelayMinutes: 30,
    healthLinkStatus: 'unknown',
    hasMembership: false,
    maxRemindersPerChallenge: 1,
    ...overrides,
  };
}

function board(overrides: Partial<ListLeaderboardOutput> = {}): ListLeaderboardOutput {
  return {
    weekStart: '2026-08-24',
    period: 'week',
    periodStart: '2026-08-24',
    entries: [
      { rank: 1, displayName: 'Bright Falcon', points: 90, isCurrentUser: false },
      { rank: 2, displayName: 'Ada', points: 60, isCurrentUser: true },
      { rank: 3, displayName: 'Calm Otter', points: 20, isCurrentUser: false },
    ],
    currentUserRank: 2,
    currentUserPoints: 60,
    currentUserVisible: true,
    ...overrides,
  };
}

function renderLeaderboard() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  const view = render(
    <QueryClientProvider client={client}>
      <LeaderboardScreen />
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
  mockedApi.me.mockResolvedValue(me());
  mockedApi.listLeaderboard.mockResolvedValue(board());
});

describe('LeaderboardScreen', () => {
  it('lists everyone in rank order', async () => {
    const { cleanup } = renderLeaderboard();

    expect(await screen.findByText('Bright Falcon')).toBeOnTheScreen();
    expect(screen.getByText('Calm Otter')).toBeOnTheScreen();
    expect(screen.getByTestId('leaderboard-row-1')).toBeOnTheScreen();
    expect(mockedApi.listLeaderboard).toHaveBeenCalledWith({ period: 'week' });

    await cleanup();
  });

  it('marks which row is yours', async () => {
    const { cleanup } = renderLeaderboard();

    expect(await screen.findByText(/Ada\s+\(you\)/)).toBeOnTheScreen();

    await cleanup();
  });

  it('tells you your rank when you are off the page', async () => {
    mockedApi.listLeaderboard.mockResolvedValue(
      board({
        entries: [
          {
            rank: 1,
            displayName: 'Bright Falcon',
            points: 90,
            isCurrentUser: false,
          },
        ],
        currentUserRank: 61,
        currentUserPoints: 5,
      }),
    );

    const { cleanup } = renderLeaderboard();

    expect(await screen.findByTestId('leaderboard-own-rank')).toHaveTextContent(
      'You are ranked 61 with 5 points this week.',
    );

    await cleanup();
  });

  it('stays quiet about your rank when you are already listed', async () => {
    const { cleanup } = renderLeaderboard();

    await screen.findByText('Bright Falcon');
    expect(screen.queryByTestId('leaderboard-own-rank')).not.toBeOnTheScreen();

    await cleanup();
  });

  it('explains when you opted out of the leaderboard', async () => {
    mockedApi.me.mockResolvedValue(me({ showOnLeaderboard: false }));
    mockedApi.listLeaderboard.mockResolvedValue(
      board({
        entries: [
          {
            rank: 1,
            displayName: 'Bright Falcon',
            points: 90,
            isCurrentUser: false,
          },
        ],
        currentUserRank: null,
        currentUserPoints: 60,
        currentUserVisible: false,
      }),
    );

    const { cleanup } = renderLeaderboard();

    expect(
      await screen.findByTestId('leaderboard-hidden-notice'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(/You turned off “Show me this week”/),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('leaderboard-own-rank')).not.toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('leaderboard-enable-in-profile'));
    expect(useRouter().push).toHaveBeenCalledWith('/(tabs)/profile');

    await cleanup();
  });

  it('uses Profile setting even if the board payload still says visible', async () => {
    mockedApi.me.mockResolvedValue(me({ showOnLeaderboard: false }));
    mockedApi.listLeaderboard.mockResolvedValue(
      board({
        entries: [
          {
            rank: 1,
            displayName: 'Bright Falcon',
            points: 90,
            isCurrentUser: false,
          },
        ],
        currentUserRank: 2,
        currentUserVisible: true,
      }),
    );

    const { cleanup } = renderLeaderboard();

    expect(
      await screen.findByTestId('leaderboard-hidden-notice'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('leaderboard-own-rank')).not.toBeOnTheScreen();

    await cleanup();
  });

  it('invites the first scorer when nobody has points yet', async () => {
    mockedApi.listLeaderboard.mockResolvedValue(
      board({ entries: [], currentUserRank: null, currentUserPoints: 0 }),
    );

    const { cleanup } = renderLeaderboard();

    expect(await screen.findByTestId('leaderboard-empty')).toBeOnTheScreen();
    expect(screen.getByText('Nobody has scored yet')).toBeOnTheScreen();

    await cleanup();
  });

  it('asks the API for the month when that chip is selected', async () => {
    const { cleanup } = renderLeaderboard();

    await screen.findByText('Bright Falcon');
    fireEvent.press(screen.getByTestId('leaderboard-period-month'));

    await waitFor(() => {
      expect(mockedApi.listLeaderboard).toHaveBeenCalledWith({ period: 'month' });
    });
    expect(
      screen.getByText('Points earned this month. Everyone starts level again on the 1st.'),
    ).toBeOnTheScreen();

    await cleanup();
  });

  it('asks the API for a condition when that chip is selected', async () => {
    const { cleanup } = renderLeaderboard();

    await screen.findByText('Bright Falcon');
    fireEvent.press(screen.getByTestId('leaderboard-category-hypertension'));

    await waitFor(() => {
      expect(mockedApi.listLeaderboard).toHaveBeenCalledWith({
        period: 'week',
        category: 'hypertension',
      });
    });

    await cleanup();
  });
});
