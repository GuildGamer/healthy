import type { ProgressDayDetail, ProgressDays } from '@product/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Metrics } from 'react-native-safe-area-context';
import { apiClient } from '@/lib/api';
import { DayActivityScreen } from './DayActivityScreen';
import { DayDetailScreen } from './DayDetailScreen';
import { HistoryScreen } from './HistoryScreen';

const testSafeAreaMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: { listProgressDays: jest.fn(), getProgressDay: jest.fn(), getProofClip: jest.fn() },
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
  getProofClip: jest.Mock;
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
          proofClip: null,
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
          proofClip: null,
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

  it('offers a finish’s share card from its page, never with a reading on it', async () => {
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
          proofClip: null,
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
          proofClip: null,
        },
      ],
      missedPhotoChecks: [],
      practice: [],
      adjustments: [],
    };
    mockedApi.getProgressDay.mockResolvedValue(detail);
    const water = renderWithQueries(<DayActivityScreen dayKey="2026-10-20" itemId="w" />);

    expect(await screen.findByTestId('activity-detail-amount')).toHaveTextContent('6 glasses');
    expect(screen.queryByTestId('activity-detail-clip')).toBeNull();
    fireEvent.press(screen.getByTestId('activity-detail-share-card'));
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
    await water.cleanup();

    const reading = renderWithQueries(<DayActivityScreen dayKey="2026-10-20" itemId="bp" />);
    fireEvent.press(await screen.findByTestId('activity-detail-share-card'));
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

    await reading.cleanup();
  });

  it('opens what was done, marking the rows that have a proof clip', async () => {
    const clip = {
      id: 'clip-1',
      displayCode: 'H7K-29Q',
      status: 'ready' as const,
      visibility: 'group' as const,
    };
    const detail: ProgressDayDetail = {
      dayKey: '2026-10-20',
      pointsEarned: 150,
      pointsLost: 0,
      dailyDoneCount: 1,
      dailyDueCount: 1,
      done: [
        {
          ...mark,
          userChallengeId: 'push',
          title: 'Do 20 push-ups',
          completedAt: '2026-10-20T08:30:00.000Z',
          points: 150,
          share: { kind: 'reps', count: 20 },
          proofClip: clip,
        },
      ],
      missedPhotoChecks: [],
      practice: [
        {
          id: 'filmed',
          title: 'Push-up practice',
          metric: 'pushups',
          count: 12,
          durationSeconds: 60,
          recordedAt: '2026-10-20T19:10:00.000Z',
          proofClip: { ...clip, id: 'clip-2', visibility: null },
        },
        {
          id: 'plain',
          title: 'Push-up practice',
          metric: 'pushups',
          count: 8,
          durationSeconds: 40,
          recordedAt: '2026-10-20T20:10:00.000Z',
          proofClip: null,
        },
      ],
      adjustments: [],
    };
    mockedApi.getProgressDay.mockResolvedValue(detail);
    const { cleanup } = renderWithQueries(<DayDetailScreen dayKey="2026-10-20" />);

    fireEvent.press(await screen.findByTestId('history-done-push'));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/history/[dayKey]/[itemId]',
      params: { dayKey: '2026-10-20', itemId: 'push' },
    });

    fireEvent.press(screen.getByTestId('history-practice-filmed'));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/history/[dayKey]/[itemId]',
      params: { dayKey: '2026-10-20', itemId: 'filmed' },
    });

    mockPush.mockClear();
    fireEvent.press(screen.getByTestId('history-practice-plain'));
    expect(mockPush).not.toHaveBeenCalled();

    await cleanup();
  });

  it('leads a filmed finish with its clip, its code, and where it was posted', async () => {
    mockedApi.getProgressDay.mockResolvedValue({
      dayKey: '2026-10-20',
      pointsEarned: 150,
      pointsLost: 0,
      dailyDoneCount: 1,
      dailyDueCount: 1,
      done: [
        {
          ...mark,
          userChallengeId: 'push',
          title: 'Do 20 push-ups',
          completedAt: '2026-10-20T08:30:00.000Z',
          points: 150,
          share: { kind: 'reps', count: 20 },
          proofClip: { id: 'clip-1', displayCode: 'H7K-29Q', status: 'ready', visibility: 'group' },
        },
      ],
      missedPhotoChecks: [],
      practice: [],
      adjustments: [],
    } satisfies ProgressDayDetail);
    mockedApi.getProofClip.mockResolvedValue({
      id: 'clip-1',
      displayCode: 'H7K-29Q',
      videoUrl: 'https://cdn.test/clip-1/video.mp4',
      posterUrl: 'https://cdn.test/clip-1/poster.jpg',
    });
    const { cleanup } = renderWithQueries(<DayActivityScreen dayKey="2026-10-20" itemId="push" />);

    expect(await screen.findByTestId('activity-detail-video')).toBeOnTheScreen();
    expect(mockedApi.getProofClip).toHaveBeenCalledWith({ clipId: 'clip-1' });
    expect(screen.getByTestId('activity-detail-code')).toHaveTextContent(
      'H7K-29Q · Posted to your group',
    );
    expect(screen.getByTestId('activity-detail-amount')).toHaveTextContent('20 push-ups');
    expect(screen.queryByTestId('proof-publish')).toBeNull();
    expect(screen.getByTestId('activity-detail-share-card')).toBeOnTheScreen();

    await cleanup();
  });
});
