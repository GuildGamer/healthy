import type { ListLeaderboardOutput } from '@product/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react-native';
import { apiClient } from '@/lib/api';
import { LeaderboardScreen } from './LeaderboardScreen';

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: { listLeaderboard: jest.fn() },
  apiQuery: {},
}));

const mockedApi = apiClient as unknown as { listLeaderboard: jest.Mock };

function board(overrides: Partial<ListLeaderboardOutput> = {}): ListLeaderboardOutput {
  return {
    weekStart: '2026-08-31',
    entries: [
      { rank: 1, displayName: 'Bright Falcon', points: 90, isCurrentUser: false },
      { rank: 2, displayName: 'Ada', points: 60, isCurrentUser: true },
      { rank: 3, displayName: 'Calm Otter', points: 20, isCurrentUser: false },
    ],
    currentUserRank: 2,
    currentUserPoints: 60,
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
  mockedApi.listLeaderboard.mockResolvedValue(board());
});

describe('LeaderboardScreen', () => {
  it('lists everyone in rank order', async () => {
    const { cleanup } = renderLeaderboard();

    expect(await screen.findByText('Bright Falcon')).toBeOnTheScreen();
    expect(screen.getByText('Calm Otter')).toBeOnTheScreen();
    expect(screen.getByTestId('leaderboard-row-1')).toBeOnTheScreen();

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

  it('invites the first scorer when nobody has points yet', async () => {
    mockedApi.listLeaderboard.mockResolvedValue(
      board({ entries: [], currentUserRank: null, currentUserPoints: 0 }),
    );

    const { cleanup } = renderLeaderboard();

    expect(await screen.findByTestId('leaderboard-empty')).toBeOnTheScreen();
    expect(screen.getByText('Nobody has scored yet')).toBeOnTheScreen();

    await cleanup();
  });
});
