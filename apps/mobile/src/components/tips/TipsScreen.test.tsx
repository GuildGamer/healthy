import type { ProgressDays } from '@product/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Metrics } from 'react-native-safe-area-context';
import { apiClient } from '@/lib/api';
import type { HealthTip } from './constants/health-tips';
import { selectDailyTip } from './select-daily-tip';
import { TipsScreen } from './TipsScreen';

const testSafeAreaMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: { me: jest.fn(), listProgressDays: jest.fn(), listTips: jest.fn() },
  apiQuery: {},
}));

jest.mock('expo-router', () => ({
  router: { canDismiss: () => true, dismiss: jest.fn(), replace: jest.fn() },
}));

const mockedApi = apiClient as unknown as {
  me: jest.Mock;
  listProgressDays: jest.Mock;
  listTips: jest.Mock;
};

const catalog: HealthTip[] = ['a', 'b', 'c'].map((id) => ({
  id,
  category: 'general',
  title: `Tip ${id}`,
  body: `Body ${id}`,
}));

function days(joinedDayKey: string): ProgressDays {
  return { dayKey: '2026-10-22', weekStartKey: '2026-10-19', joinedDayKey, days: [] };
}

function renderTips() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = render(
    <QueryClientProvider client={client}>
      <SafeAreaProvider initialMetrics={testSafeAreaMetrics}>
        <TipsScreen />
      </SafeAreaProvider>
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
  mockedApi.me.mockResolvedValue({ categories: ['general'] });
  mockedApi.listTips.mockResolvedValue({ tips: catalog });
});

describe('TipsScreen', () => {
  it('shows today’s tip, then the ones from earlier days', async () => {
    mockedApi.listProgressDays.mockResolvedValue(days('2026-10-01'));
    const todayTip = selectDailyTip(catalog, ['general'], '2026-10-22');
    const yesterdayTip = selectDailyTip(catalog, ['general'], '2026-10-21');
    const { cleanup } = renderTips();

    expect(await screen.findByText(todayTip?.title ?? '')).toBeOnTheScreen();
    expect(screen.getByText('EARLIER')).toBeOnTheScreen();
    expect(screen.getByText(`Yesterday · Everyday health`)).toBeOnTheScreen();
    expect(screen.getByText(yesterdayTip?.title ?? '')).toBeOnTheScreen();

    await cleanup();
  });

  it('says more arrive daily on the first day', async () => {
    mockedApi.listProgressDays.mockResolvedValue(days('2026-10-22'));
    const { cleanup } = renderTips();

    expect(
      await screen.findByText('A new tip every day. The ones you’ve had collect here.'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('EARLIER')).toBeNull();

    await cleanup();
  });
});
