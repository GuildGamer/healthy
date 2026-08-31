import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { apiClient } from '@/lib/api';
import { healthTips } from './constants/health-tips';
import { TipsScreen } from './TipsScreen';

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    me: jest.fn(),
    listTodayChallenges: jest.fn(),
    listTips: jest.fn(),
  },
  apiQuery: {},
}));

const mockedApi = apiClient as unknown as {
  me: jest.Mock;
  listTodayChallenges: jest.Mock;
  listTips: jest.Mock;
};

function renderTips() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { gcTime: 0 },
    },
  });

  const view = render(
    <QueryClientProvider client={client}>
      <TipsScreen />
    </QueryClientProvider>,
  );

  return {
    async cleanup() {
      view.unmount();
      client.clear();
    },
  };
}

describe('TipsScreen', () => {
  beforeEach(() => {
    mockedApi.me.mockResolvedValue({
      id: 'u1',
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      categories: ['hypertension'],
    });
    mockedApi.listTodayChallenges.mockResolvedValue({
      dayKey: '2026-08-28',
      challenges: [],
      completedCount: 0,
      totalCount: 0,
    });
    mockedApi.listTips.mockResolvedValue({ tips: healthTips });
  });

  it('stages today as a quote and lists the rest as category rows', async () => {
    const { cleanup } = renderTips();

    expect(
      await screen.findByText(/Today · Blood pressure|Today · Everyday health/),
    ).toBeOnTheScreen();
    expect(screen.getByText('Blood pressure')).toBeOnTheScreen();
    expect(screen.getByText('Everyday health')).toBeOnTheScreen();
    expect(screen.getByText('All tips')).toBeOnTheScreen();
    expect(screen.getByTestId('tip-section-switch')).toBeOnTheScreen();
    expect(screen.getByTestId('tips-screen')).toBeOnTheScreen();
    expect(screen.getAllByTestId(/^tip-/).length).toBeGreaterThan(1);

    await cleanup();
  });

  it('focuses one condition from the browse rail', async () => {
    const { cleanup } = renderTips();

    fireEvent.press(await screen.findByTestId('tip-section-general'));

    expect(screen.getByText('Everyday health')).toBeOnTheScreen();
    expect(screen.queryByText('All tips')).toBeNull();
    expect(screen.queryByText('Blood pressure')).toBeNull();

    fireEvent.press(screen.getByTestId('tip-section-all'));

    expect(screen.getByText('All tips')).toBeOnTheScreen();
    expect(screen.getByText('Blood pressure')).toBeOnTheScreen();

    await cleanup();
  });
});
