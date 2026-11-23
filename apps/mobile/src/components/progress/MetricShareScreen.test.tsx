import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import { apiClient } from '@/lib/api';
import { MetricShareScreen } from './MetricShareScreen';

const safeArea: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    getMetricPeriodStats: jest.fn(),
  },
  apiQuery: {},
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
  }),
}));

const mockedApi = apiClient as unknown as {
  getMetricPeriodStats: jest.Mock;
};

function renderShare() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = render(
    <SafeAreaProvider initialMetrics={safeArea}>
      <QueryClientProvider client={client}>
        <MetricShareScreen metric="pushups" period="week" />
      </QueryClientProvider>
    </SafeAreaProvider>,
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

describe('MetricShareScreen', () => {
  it('shows the poster, colour carousel, and Share (Challenge lives in the sheet)', async () => {
    const { cleanup } = renderShare();

    expect(await screen.findByTestId('metric-share-screen')).toBeOnTheScreen();
    expect(await screen.findByTestId('share-poster-image')).toBeOnTheScreen();
    expect(screen.getByTestId('share-fill-carousel')).toBeOnTheScreen();
    expect(screen.getByTestId('metric-share-open')).toBeOnTheScreen();
    expect(screen.queryByTestId('share-destination-row')).toBeNull();

    await cleanup();
  });
});
