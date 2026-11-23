import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import { apiClient } from '@/lib/api';
import { PeriodShareScreen } from './PeriodShareScreen';

const safeArea: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    getPeriodReport: jest.fn(),
  },
  apiQuery: {},
}));

const mockedApi = apiClient as unknown as {
  getPeriodReport: jest.Mock;
};

function renderShare() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = render(
    <SafeAreaProvider initialMetrics={safeArea}>
      <QueryClientProvider client={client}>
        <PeriodShareScreen period="week" />
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
  mockedApi.getPeriodReport.mockResolvedValue({
    period: 'week',
    periodLabel: 'Nov 9–11',
    activeDays: 6,
    highlight: { metric: 'pushups', count: 240, unit: 'push-ups' },
    metrics: [{ metric: 'pushups', count: 240, unit: 'push-ups' }],
    startDayKey: '2026-11-09',
    endDayKey: '2026-11-11',
  });
});

describe('PeriodShareScreen', () => {
  it('shows the poster, colour carousel, and Share (destinations stay in the sheet)', async () => {
    const { cleanup } = renderShare();

    expect(await screen.findByTestId('period-share-screen')).toBeOnTheScreen();
    expect(await screen.findByTestId('share-poster-image')).toBeOnTheScreen();
    expect(screen.getByTestId('share-fill-carousel')).toBeOnTheScreen();
    expect(screen.getByTestId('period-share-open')).toBeOnTheScreen();
    expect(screen.queryByTestId('share-destination-row')).toBeNull();

    await cleanup();
  });
});
