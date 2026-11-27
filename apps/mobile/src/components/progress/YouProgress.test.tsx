import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { apiClient } from '@/lib/api';
import { me, progressDays, weeklyBoard } from './testing/progress-fixtures';
import { YouProgress } from './YouProgress';

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    me: jest.fn(),
    listProgressDays: jest.fn(),
    listLeaderboard: jest.fn(),
    listTips: jest.fn(),
  },
  apiQuery: {},
}));

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useFocusEffect: () => undefined,
  useRouter: () => ({ push: (href: unknown) => mockPush(href) }),
}));

const mockedApi = apiClient as unknown as {
  me: jest.Mock;
  listProgressDays: jest.Mock;
  listLeaderboard: jest.Mock;
  listTips: jest.Mock;
};

function renderProgress() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = render(
    <QueryClientProvider client={client}>
      <YouProgress />
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
  mockedApi.listProgressDays.mockResolvedValue(progressDays());
  mockedApi.listLeaderboard.mockResolvedValue(weeklyBoard());
  mockedApi.listTips.mockResolvedValue({ tips: [] });
});

describe('YouProgress', () => {
  it('leads with the week, then the run, points and this week’s place', async () => {
    const { cleanup } = renderProgress();

    expect(await screen.findByTestId('progress-week-card')).toBeOnTheScreen();
    expect(screen.getByText('of 4 days so far')).toBeOnTheScreen();
    expect(screen.getByText('3')).toBeOnTheScreen();
    expect(screen.getByTestId('progress-stat-run')).toHaveTextContent(/1\s+best 12/);
    expect(screen.getByTestId('progress-stat-points')).toHaveTextContent(/4,350/);
    expect(await screen.findByText('38th')).toBeOnTheScreen();
    expect(screen.getByText('41 points to pass 37th')).toBeOnTheScreen();

    await cleanup();
  });

  it('opens Reports, History, the leaderboard, Tips and Verify a clip from their rows', async () => {
    const { cleanup } = renderProgress();

    fireEvent.press(await screen.findByTestId('progress-open-reports'));
    fireEvent.press(screen.getByTestId('progress-open-history'));
    fireEvent.press(screen.getByTestId('progress-open-leaderboard'));
    fireEvent.press(screen.getByTestId('progress-open-tips'));
    fireEvent.press(screen.getByTestId('progress-open-verify-clip'));

    expect(mockPush.mock.calls.map(([href]) => href)).toEqual([
      '/progress/reports',
      '/history',
      '/leaderboard',
      '/tips',
      '/v/new',
    ]);

    await cleanup();
  });


  it('shows the same calm card when the week does not load, and keeps the rows', async () => {
    mockedApi.listProgressDays.mockRejectedValue(new Error('offline'));
    const { cleanup } = renderProgress();

    expect(await screen.findByText('Your week didn’t load.')).toBeOnTheScreen();
    expect(screen.getByTestId('progress-open-history')).toBeOnTheScreen();

    await cleanup();
  });
});
