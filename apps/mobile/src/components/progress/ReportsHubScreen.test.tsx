import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { apiClient } from '@/lib/api';
import { ReportsHubScreen } from './ReportsHubScreen';

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    listChallengeCatalog: jest.fn(),
  },
  apiQuery: {},
}));

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
    push: (href: unknown) => mockPush(href),
  }),
}));

const mockedApi = apiClient as unknown as {
  listChallengeCatalog: jest.Mock;
};

function renderHub() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = render(
    <QueryClientProvider client={client}>
      <ReportsHubScreen />
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
  mockedApi.listChallengeCatalog.mockResolvedValue({
    challenges: [
      {
        id: 'c-push',
        title: 'Daily push-ups',
        isEnrolled: true,
        capture: { metric: 'pushups' },
      },
      {
        id: 'c-walk',
        title: 'Daily walk',
        isEnrolled: true,
        capture: { metric: 'walk' },
      },
      {
        id: 'c-other',
        title: 'Not enrolled',
        isEnrolled: false,
        capture: { metric: 'squats' },
      },
    ],
  });
});

describe('ReportsHubScreen', () => {
  it('lists days active then enrolled workouts, and opens each detail route', async () => {
    const { cleanup } = renderHub();

    fireEvent.press(await screen.findByTestId('reports-open-period'));
    fireEvent.press(screen.getByTestId('reports-open-metric-pushups'));
    fireEvent.press(screen.getByTestId('reports-open-metric-walk'));

    expect(screen.queryByTestId('reports-open-metric-squats')).toBeNull();
    expect(mockPush.mock.calls.map(([href]) => href)).toEqual([
      '/progress/report?period=week',
      '/progress/metric/pushups?period=week',
      '/progress/metric/walk?period=week',
    ]);

    await cleanup();
  });
});
