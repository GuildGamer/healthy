import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { apiClient } from '@/lib/api';
import { PeriodReportScreen } from './PeriodReportScreen';

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    getPeriodReport: jest.fn(),
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
  useLocalSearchParams: () => ({ period: 'week' }),
}));

const mockedApi = apiClient as unknown as {
  getPeriodReport: jest.Mock;
};

function renderReport() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = render(
    <QueryClientProvider client={client}>
      <PeriodReportScreen />
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

describe('PeriodReportScreen', () => {
  it('keeps the recap on the page and opens the share preview', async () => {
    const { cleanup } = renderReport();

    expect(await screen.findByTestId('period-report-share')).toBeOnTheScreen();
    expect(screen.queryByTestId('share-fill-carousel')).toBeNull();
    expect(screen.queryByTestId('share-poster-image')).toBeNull();

    fireEvent.press(screen.getByTestId('period-report-share'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/challenge/share',
      params: expect.objectContaining({
        kind: 'streak',
        label: 'Week recap',
        value: '6',
        runLine: '240 push-ups',
        facts: expect.stringContaining('Push-ups'),
      }),
    });

    await cleanup();
  });
});
