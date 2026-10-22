import type { ProgressDayDetail, ProgressDays } from '@product/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Metrics } from 'react-native-safe-area-context';
import { apiClient } from '@/lib/api';
import { DayDetailScreen } from './DayDetailScreen';
import { HistoryScreen } from './HistoryScreen';

const testSafeAreaMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: { listProgressDays: jest.fn(), getProgressDay: jest.fn() },
  apiQuery: {},
}));

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: (href: unknown) => mockPush(href) }),
  router: { canDismiss: () => true, dismiss: jest.fn(), replace: jest.fn() },
}));

const mockedApi = apiClient as unknown as {
  listProgressDays: jest.Mock;
  getProgressDay: jest.Mock;
};

const capture = {
  kind: 'self_report' as const,
  metric: null,
  target: { durationMinutes: null, distanceMeters: null, count: null },
};
const mark = {
  challengeId: 'c',
  category: 'general' as const,
  completionKind: 'check_in' as const,
  capture,
};

function renderWithQueries(element: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = render(
    <QueryClientProvider client={client}>
      <SafeAreaProvider initialMetrics={testSafeAreaMetrics}>{element}</SafeAreaProvider>
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

function progress(overrides: Partial<ProgressDays> = {}): ProgressDays {
  return {
    dayKey: '2026-10-22',
    weekStartKey: '2026-10-19',
    joinedDayKey: '2026-09-01',
    days: [
      {
        dayKey: '2026-10-22',
        dailyChallenges: [
          { ...mark, isDone: true },
          { ...mark, isDone: false },
        ],
        pointsTotal: 150,
        pointsLost: 0,
        isShownUp: true,
      },
      {
        dayKey: '2026-10-20',
        dailyChallenges: [{ ...mark, isDone: true }],
        pointsTotal: 50,
        pointsLost: 100,
        isShownUp: true,
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('HistoryScreen', () => {
  it('lists a row per day under its week, with the photo check loss in its day', async () => {
    mockedApi.listProgressDays.mockResolvedValue(progress());
    const { cleanup } = renderWithQueries(<HistoryScreen />);

    expect(await screen.findByText('THIS WEEK')).toBeOnTheScreen();
    expect(screen.getByText('+200')).toBeOnTheScreen();
    expect(screen.getByText('1 of 2 so far')).toBeOnTheScreen();
    expect(screen.getByText('−100 photo check')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('history-day-2026-10-20'));
    expect(mockPush).toHaveBeenCalledWith('/history/2026-10-20');

    await cleanup();
  });

  it('says what the page becomes on your first day', async () => {
    mockedApi.listProgressDays.mockResolvedValue(
      progress({ joinedDayKey: '2026-10-22', days: progress().days.slice(0, 1) }),
    );
    const { cleanup } = renderWithQueries(<HistoryScreen />);

    expect(await screen.findByTestId('history-first-day')).toBeOnTheScreen();

    await cleanup();
  });
});

describe('DayDetailScreen', () => {
  it('shows each challenge, the missed photo check with its reason, and practice reps', async () => {
    const detail: ProgressDayDetail = {
      dayKey: '2026-10-20',
      pointsEarned: 150,
      pointsLost: 100,
      dailyDoneCount: 1,
      dailyDueCount: 2,
      done: [
        {
          ...mark,
          userChallengeId: 'w',
          title: 'Log your water',
          completedAt: '2026-10-20T08:30:00.000Z',
          points: 150,
          share: null,
        },
      ],
      missedPhotoChecks: [
        {
          ...mark,
          userChallengeId: 'g',
          title: 'Gym session',
          resolution: 'expired',
          windowSeconds: 600,
          pointsLost: 100,
          at: '2026-10-20T18:40:00.000Z',
        },
      ],
      practice: [
        {
          id: 'p',
          title: 'Push-up practice',
          metric: 'pushups',
          count: 14,
          durationSeconds: 90,
          recordedAt: '2026-10-20T19:10:00.000Z',
        },
      ],
      adjustments: [],
    };
    mockedApi.getProgressDay.mockResolvedValue(detail);
    const { cleanup } = renderWithQueries(<DayDetailScreen dayKey="2026-10-20" />);

    expect(await screen.findByTestId('history-day-total')).toHaveTextContent('+50');
    expect(screen.getByText('150 earned, 100 lost to a missed photo check.')).toBeOnTheScreen();
    expect(screen.getByText('1 of 2')).toBeOnTheScreen();
    expect(screen.getByText('Log your water')).toBeOnTheScreen();
    expect(screen.getByText('No photo within 10 minutes of the check-in.')).toBeOnTheScreen();
    expect(screen.getByText('14 reps')).toBeOnTheScreen();
    expect(mockedApi.getProgressDay).toHaveBeenCalledWith({ dayKey: '2026-10-20' });

    await cleanup();
  });

  it('opens the share card for the finish that was tapped', async () => {
    const detail: ProgressDayDetail = {
      dayKey: '2026-10-20',
      pointsEarned: 300,
      pointsLost: 0,
      dailyDoneCount: 2,
      dailyDueCount: 2,
      done: [
        {
          ...mark,
          completionKind: 'water',
          capture: { ...capture, kind: 'structured_log' },
          userChallengeId: 'w',
          title: 'Log your water',
          completedAt: '2026-10-20T08:30:00.000Z',
          points: 150,
          share: { kind: 'glasses', count: 6 },
        },
        {
          ...mark,
          category: 'hypertension',
          completionKind: 'vitals_bp',
          userChallengeId: 'bp',
          title: 'Check your blood pressure',
          completedAt: '2026-10-20T09:15:00.000Z',
          points: 150,
          share: null,
        },
      ],
      missedPhotoChecks: [],
      practice: [],
      adjustments: [],
    };
    mockedApi.getProgressDay.mockResolvedValue(detail);
    const { cleanup } = renderWithQueries(<DayDetailScreen dayKey="2026-10-20" />);

    fireEvent.press(await screen.findByTestId('history-done-w'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/challenge/share',
      params: {
        kind: 'water',
        label: 'Log your water',
        value: '6',
        unit: 'glasses',
        when: '2026-10-20T08:30:00.000Z',
        friend: 'day',
        userChallengeId: 'w',
      },
    });

    fireEvent.press(screen.getByTestId('history-done-bp'));
    const readingRoute: unknown = mockPush.mock.calls.at(-1)?.[0];
    expect(readingRoute).toMatchObject({
      pathname: '/challenge/share',
      params: {
        kind: 'bloodPressure',
        label: 'Check your blood pressure',
        value: 'Logged',
        unit: '20 Oct',
        when: '2026-10-20T09:15:00.000Z',
        friend: 'day',
        userChallengeId: 'bp',
      },
    });
    expect(JSON.stringify(readingRoute)).not.toMatch(/128|82|mmol|L\/min/);

    await cleanup();
  });
});
