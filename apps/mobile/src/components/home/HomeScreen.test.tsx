import type { TodayChallenge } from '@product/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Metrics } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { apiClient } from '@/lib/api';
import { HomeScreen } from './HomeScreen';

/** `useSafeAreaInsets` throws without a provider, and native metrics are async. */
const testSafeAreaMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    me: jest.fn(),
    listTodayChallenges: jest.fn(),
    listNotifications: jest.fn(),
    listLeaderboard: jest.fn(),
    startChallenge: jest.fn(),
    completeChallenge: jest.fn(),
    updateTimeZone: jest.fn(),
    listTips: jest.fn(),
  },
  apiQuery: {},
}));

jest.mock('@/lib/auth-client', () => ({
  useSession: () => ({
    data: {
      user: { name: 'Ada Lovelace', email: 'ada@example.com' },
    },
  }),
}));

jest.mock('expo-router', () => {
  const push = jest.fn();
  return {
    useRouter: () => ({ push }),
  };
});

const mockedApi = apiClient as unknown as {
  me: jest.Mock;
  listTodayChallenges: jest.Mock;
  listNotifications: jest.Mock;
  listLeaderboard: jest.Mock;
  startChallenge: jest.Mock;
  completeChallenge: jest.Mock;
  updateTimeZone: jest.Mock;
  listTips: jest.Mock;
};

function challenge(overrides: Partial<TodayChallenge>): TodayChallenge {
  return {
    id: 'uc1',
    challengeId: 'c1',
    title: 'Walk 20 minutes',
    description: 'A brisk walk after lunch.',
    category: 'general',
    rewardPoints: 20,
    status: 'pending',
    frequency: 'daily',
    completionKind: 'check_in',
    instruction: 'A brisk walk after lunch.',
    icon: 'walk',
    periodKey: '2026-08-28',
    evidenceRequest: null,
    draft: null,
    progress: { filled: 0, required: 1 },
    capture: {
      kind: 'self_report',
      metric: null,
      target: { durationMinutes: null, distanceMeters: null, count: null },
    },
    ...overrides,
  };
}

function renderHome() {
  // Default mutation `gcTime` schedules a five minute timer that would keep the
  // Jest process alive after the run finishes.
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });

  function wrap(ui: ReactElement) {
    return (
      <SafeAreaProvider initialMetrics={testSafeAreaMetrics}>
        <QueryClientProvider client={client}>{ui}</QueryClientProvider>
      </SafeAreaProvider>
    );
  }

  const view = render(wrap(<HomeScreen />));

  return {
    client,
    cleanup: async () => {
      await waitFor(() => {
        expect(client.isFetching()).toBe(0);
      });
      view.unmount();
      client.clear();
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedApi.me.mockResolvedValue({
    id: 'u1',
    email: 'ada@example.com',
    name: 'Ada Lovelace',
    categories: ['hypertension'],
    pointsBalance: 150,
    currentStreakDays: 7,
    // Matches the device zone under test, so no sync request is triggered.
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    reminderEnabled: false,
    reminderMinute: 1140,
    evidenceRemindersEnabled: true,
    promotionalMessagesEnabled: false,
    showOnLeaderboard: true,
    inProgressNudgeEnabled: true,
    inProgressNudgeDelayMinutes: 30,
    healthLinkStatus: 'unknown',
  });
  mockedApi.listNotifications.mockResolvedValue({
    notifications: [],
    unreadCount: 0,
  });
  mockedApi.listTodayChallenges.mockResolvedValue({
    dayKey: '2026-08-28',
    challenges: [],
    completedCount: 0,
    totalCount: 0,
  });
  mockedApi.listTips.mockResolvedValue({
    tips: [
      {
        id: 'salt',
        category: 'hypertension',
        title: 'Reduce salt today for better blood pressure',
        body: 'Most sodium comes from packaged food.',
      },
      {
        id: 'water-before-meals',
        category: 'general',
        title: 'Drink a glass of water before each meal',
        body: 'It is the easiest hydration habit to remember.',
      },
    ],
  });
  mockedApi.listLeaderboard.mockResolvedValue({
    weekStart: '2026-08-24',
    period: 'week',
    periodStart: '2026-08-24',
    entries: [],
    currentUserRank: 8,
    currentUserPoints: 150,
  });
});

describe('HomeScreen', () => {
  it('renders Figma home structure with flame streak and today', async () => {
    const { cleanup } = renderHome();

    expect(await screen.findByText('Hi, Ada')).toBeOnTheScreen();
    expect(screen.getByText(/day streak/)).toBeOnTheScreen();
    expect(await screen.findByText('Rank 8 this week')).toBeOnTheScreen();
    expect(screen.getByTestId('home-rank-trophy')).toBeOnTheScreen();
    expect(screen.queryByTestId('home-rank-medal')).toBeNull();
    expect(screen.getByText("Today's Challenges")).toBeOnTheScreen();

    await cleanup();
  });

  it('stages the daily tip as a quote, not a menu row', async () => {
    const { cleanup } = renderHome();

    // 'hypertension' is the only selected category, so the rotation is limited
    // to its three tips plus the general ones.
    expect(await screen.findByTestId('home-daily-tip')).toBeOnTheScreen();
    expect(
      await screen.findByText(/Blood pressure|Everyday health/),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        /Reduce salt|reading at the same time|after your largest meal|glass of water|every hour|sleep and wake/,
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Health Tips')).toBeNull();
    expect(screen.queryByText('Leaderboard')).toBeNull();

    await cleanup();
  });

  it('pins a medal on the rank line when you are on the podium', async () => {
    mockedApi.listLeaderboard.mockResolvedValue({
      weekStart: '2026-08-24',
      period: 'week',
      periodStart: '2026-08-24',
      entries: [],
      currentUserRank: 1,
      currentUserPoints: 150,
    });

    const { cleanup } = renderHome();

    expect(await screen.findByText('Rank 1 this week')).toBeOnTheScreen();
    expect(screen.getByTestId('home-rank-medal')).toBeOnTheScreen();
    expect(screen.queryByTestId('home-rank-trophy')).toBeNull();

    await cleanup();
  });

  it('opens the board and tips from the rank line and tip card', async () => {
    const { cleanup } = renderHome();

    fireEvent.press(await screen.findByTestId('home-leaderboard'));
    expect(useRouter().push).toHaveBeenCalledWith('/leaderboard');

    fireEvent.press(await screen.findByTestId('home-daily-tip'));
    expect(useRouter().push).toHaveBeenCalledWith('/tips');

    fireEvent.press(screen.getByTestId('home-points-card'));
    expect(useRouter().push).toHaveBeenCalledWith('/points');

    await cleanup();
  });

  it('opens notifications from the bell, not reminder settings', async () => {
    const { cleanup } = renderHome();

    expect(await screen.findByLabelText('Notifications')).toBeOnTheScreen();
    expect(screen.getByTestId('open-notifications')).toBeOnTheScreen();
    expect(screen.getByTestId('open-profile')).toBeOnTheScreen();

    await cleanup();
  });

  it('badges the bell when the inbox has unread items', async () => {
    mockedApi.listNotifications.mockResolvedValue({
      notifications: [],
      unreadCount: 2,
    });

    const { cleanup } = renderHome();

    expect(
      await screen.findByLabelText('2 unread notifications'),
    ).toBeOnTheScreen();

    await cleanup();
  });

  it('labels each challenge by where it sits in the status ladder', async () => {
    mockedApi.listTodayChallenges.mockResolvedValue({
      dayKey: '2026-08-28',
      challenges: [
        challenge({ id: 'uc1', status: 'pending' }),
        challenge({ id: 'uc2', status: 'in_progress' }),
        challenge({ id: 'uc3', status: 'completed' }),
      ],
      completedCount: 1,
      totalCount: 3,
    });

    const { cleanup } = renderHome();

    expect(await screen.findByText('Log')).toBeOnTheScreen();
    expect(screen.getByText('Confirm')).toBeOnTheScreen();
    expect(screen.getByText('Done')).toBeOnTheScreen();
    expect(screen.getByTestId('challenge-progress-uc1')).toBeOnTheScreen();
    expect(screen.getByTestId('challenge-progress-uc3')).toBeOnTheScreen();
    expect(screen.queryByTestId('home-see-all-challenges')).toBeNull();

    await cleanup();
  });

  it('opens the confirm screen instead of completing a check-in on the card', async () => {
    mockedApi.listTodayChallenges.mockResolvedValue({
      dayKey: '2026-08-28',
      challenges: [
        challenge({ id: 'uc1', challengeId: 'c1', status: 'pending' }),
        challenge({ id: 'uc2', challengeId: 'c2', status: 'in_progress' }),
      ],
      completedCount: 0,
      totalCount: 2,
    });

    const { cleanup } = renderHome();

    fireEvent.press(await screen.findByTestId('advance-challenge-uc1'));
    expect(useRouter().push).toHaveBeenCalledWith('/challenge/c1/confirm');

    fireEvent.press(screen.getByTestId('advance-challenge-uc2'));
    expect(useRouter().push).toHaveBeenCalledWith('/challenge/c2/confirm');

    await cleanup();
  });

  it('opens the log screen when Finish is a blood-pressure reading', async () => {
    mockedApi.listTodayChallenges.mockResolvedValue({
      dayKey: '2026-08-28',
      challenges: [
        challenge({
          id: 'uc-bp',
          challengeId: 'c-bp',
          status: 'in_progress',
          completionKind: 'vitals_bp',
          title: 'Check blood pressure',
        }),
      ],
      completedCount: 0,
      totalCount: 1,
    });

    const { cleanup } = renderHome();

    fireEvent.press(await screen.findByTestId('advance-challenge-uc-bp'));

    expect(useRouter().push).toHaveBeenCalledWith('/challenge/c-bp/log');
    expect(mockedApi.completeChallenge).not.toHaveBeenCalled();

    await cleanup();
  });

  it('opens the evidence screen when Finish is a gym photo', async () => {
    mockedApi.listTodayChallenges.mockResolvedValue({
      dayKey: '2026-08-28',
      challenges: [
        challenge({
          id: 'uc-gym',
          challengeId: 'c-gym',
          status: 'in_progress',
          completionKind: 'evidence_photo',
          title: 'Complete a gym session',
        }),
      ],
      completedCount: 0,
      totalCount: 1,
    });

    const { cleanup } = renderHome();

    fireEvent.press(await screen.findByTestId('advance-challenge-uc-gym'));

    expect(useRouter().push).toHaveBeenCalledWith('/challenge/c-gym/evidence');
    expect(mockedApi.completeChallenge).not.toHaveBeenCalled();

    await cleanup();
  });

  it('keeps extra today challenges on the Challenges tab', async () => {
    mockedApi.listTodayChallenges.mockResolvedValue({
      dayKey: '2026-08-28',
      challenges: [
        challenge({ id: 'uc1', challengeId: 'c1', title: 'Walk 20 minutes' }),
        challenge({ id: 'uc2', challengeId: 'c2', title: 'Drink water' }),
        challenge({ id: 'uc3', challengeId: 'c3', title: 'Take evening stretch' }),
        challenge({ id: 'uc4', challengeId: 'c4', title: 'Log breakfast' }),
        challenge({ id: 'uc5', challengeId: 'c5', title: 'Evening walk' }),
        challenge({ id: 'uc6', challengeId: 'c6', title: 'Wind-down stretch' }),
      ],
      completedCount: 0,
      totalCount: 6,
    });

    const { cleanup } = renderHome();

    expect(await screen.findByText('Walk 20 minutes')).toBeOnTheScreen();
    expect(screen.getByText('Drink water')).toBeOnTheScreen();
    expect(screen.getByText('Take evening stretch')).toBeOnTheScreen();
    expect(screen.getByText('Log breakfast')).toBeOnTheScreen();
    expect(screen.getByText('Evening walk')).toBeOnTheScreen();
    expect(screen.queryByText('Wind-down stretch')).toBeNull();

    fireEvent.press(screen.getByTestId('home-see-all-challenges'));
    expect(useRouter().push).toHaveBeenCalledWith('/(tabs)/challenges');

    await cleanup();
  });

  it('opens challenge details from the row body', async () => {
    mockedApi.listTodayChallenges.mockResolvedValue({
      dayKey: '2026-08-28',
      challenges: [challenge({})],
      completedCount: 0,
      totalCount: 1,
    });

    const { cleanup } = renderHome();

    fireEvent.press(await screen.findByTestId('open-challenge-c1'));
    expect(useRouter().push).toHaveBeenCalledWith('/challenge/c1');

    await cleanup();
  });
});

