import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { apiClient } from '@/lib/api';
import { MetricStatsScreen } from './MetricStatsScreen';

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    getMetricPeriodStats: jest.fn(),
  },
  apiQuery: {},
}));

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
    push: (href: unknown) => mockPush(href),
    setParams: jest.fn(),
  }),
  useLocalSearchParams: () => ({ metric: 'pushups', period: 'week' }),
}));

const mockedApi = apiClient as unknown as {
  getMetricPeriodStats: jest.Mock;
};

function renderStats() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = render(
    <QueryClientProvider client={client}>
      <MetricStatsScreen />
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
  mockedApi.getMetricPeriodStats.mockResolvedValue({
    metric: 'pushups',
    period: 'week',
    periodLabel: 'Nov 9–11',
    count: 33,
    unit: 'push-ups',
    activeDays: 2,
    windowDays: 7,
    bestDay: { dayKey: '2026-11-10', count: 23 },
    avgPerDay: 11,
    startDayKey: '2026-11-09',
    endDayKey: '2026-11-11',
  });
});

describe('MetricStatsScreen', () => {
  it('keeps stats on the page and opens the share preview with facts', async () => {
    const { cleanup } = renderStats();

    expect(await screen.findByTestId('metric-stats-share')).toBeOnTheScreen();
    expect(screen.queryByTestId('share-fill-carousel')).toBeNull();
    expect(screen.queryByTestId('share-poster-image')).toBeNull();

    fireEvent.press(screen.getByTestId('metric-stats-share'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/challenge/share',
      params: expect.objectContaining({
        kind: 'strength',
        label: 'Push-ups',
        value: '33',
        unit: 'push-ups',
        corner: 'Nov 9–11',
        runLine: '2 days on',
        facts: expect.stringContaining('Best day'),
      }),
    });

    await cleanup();
  });
});
