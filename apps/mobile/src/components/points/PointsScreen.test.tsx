import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { apiClient } from '@/lib/api';
import { PointsScreen } from './PointsScreen';

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    me: jest.fn(),
    listActivity: jest.fn(),
  },
  apiQuery: {},
}));

const mockedApi = apiClient as unknown as {
  me: jest.Mock;
  listActivity: jest.Mock;
};

function renderPoints() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { gcTime: 0 },
    },
  });

  const view = render(
    <QueryClientProvider client={client}>
      <PointsScreen />
    </QueryClientProvider>,
  );

  return {
    async cleanup() {
      view.unmount();
      client.clear();
    },
  };
}

describe('PointsScreen', () => {
  beforeEach(() => {
    mockedApi.me.mockResolvedValue({
      pointsBalance: 145,
    });
    mockedApi.listActivity.mockResolvedValue({
      items: [
        {
          id: 'earn-1',
          delta: 20,
          reason: 'Completed: Walk 20 minutes',
          createdAt: '2026-08-30T10:00:00.000Z',
        },
        {
          id: 'pen-1',
          delta: -25,
          reason: 'Skipped photo check',
          createdAt: '2026-08-30T11:00:00.000Z',
        },
      ],
    });
  });

  it('shows the balance and filters the ledger', async () => {
    const { cleanup } = renderPoints();

    expect(await screen.findByText('145')).toBeOnTheScreen();
    expect(await screen.findByTestId('activity-earn-1')).toBeOnTheScreen();
    expect(screen.getByTestId('activity-pen-1')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('points-scope-penalties'));

    expect(screen.getByTestId('activity-pen-1')).toBeOnTheScreen();
    expect(screen.queryByTestId('activity-earn-1')).toBeNull();

    fireEvent.press(screen.getByTestId('points-scope-earned'));

    expect(screen.getByTestId('activity-earn-1')).toBeOnTheScreen();
    expect(screen.queryByTestId('activity-pen-1')).toBeNull();

    await cleanup();
  });
});
