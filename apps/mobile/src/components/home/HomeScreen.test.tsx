import type { TodayChallenge } from '@product/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Metrics } from 'react-native-safe-area-context';
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
    startChallenge: jest.fn(),
    completeChallenge: jest.fn(),
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

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const mockedApi = apiClient as unknown as {
  me: jest.Mock;
  listTodayChallenges: jest.Mock;
  startChallenge: jest.Mock;
  completeChallenge: jest.Mock;
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
    dayKey: '2026-08-28',
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
  });
  mockedApi.listTodayChallenges.mockResolvedValue({
    dayKey: '2026-08-28',
    challenges: [],
    completedCount: 0,
    totalCount: 0,
  });
});

describe('HomeScreen', () => {
  it('renders Figma home structure with flame streak and quick links', async () => {
    const { cleanup } = renderHome();

    expect(await screen.findByText('Hi, Ada')).toBeOnTheScreen();
    expect(screen.getByText(/day streak/)).toBeOnTheScreen();
    expect(screen.getByText('Leaderboard')).toBeOnTheScreen();
    expect(screen.getByText('Health Tips')).toBeOnTheScreen();
    expect(screen.getByText("Today's Challenges")).toBeOnTheScreen();
    expect(
      screen.getByText('Reduce salt today for better blood pressure control.'),
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

    expect(await screen.findByText('Start')).toBeOnTheScreen();
    expect(screen.getByText('Finish')).toBeOnTheScreen();
    expect(screen.getByText('Done')).toBeOnTheScreen();

    await cleanup();
  });

  it('starts a pending challenge and completes one already in progress', async () => {
    mockedApi.listTodayChallenges.mockResolvedValue({
      dayKey: '2026-08-28',
      challenges: [
        challenge({ id: 'uc1', status: 'pending' }),
        challenge({ id: 'uc2', status: 'in_progress' }),
      ],
      completedCount: 0,
      totalCount: 2,
    });
    mockedApi.startChallenge.mockResolvedValue({
      challenge: challenge({ id: 'uc1', status: 'in_progress' }),
    });

    const { cleanup } = renderHome();

    fireEvent.press(await screen.findByTestId('advance-challenge-uc1'));
    await waitFor(() => {
      expect(mockedApi.startChallenge).toHaveBeenCalledWith({
        userChallengeId: 'uc1',
      });
    });

    fireEvent.press(screen.getByTestId('advance-challenge-uc2'));
    await waitFor(() => {
      expect(mockedApi.completeChallenge).toHaveBeenCalledWith({
        userChallengeId: 'uc2',
      });
    });

    await cleanup();
  });
});
