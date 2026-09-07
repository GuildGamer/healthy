import type { TodayChallenge } from '@product/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { apiClient } from '@/lib/api';
import { ChallengesScreen } from './ChallengesScreen';

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    listTodayChallenges: jest.fn(),
    listMyMatches: jest.fn(),
    me: jest.fn(),
    startChallenge: jest.fn(),
    completeChallenge: jest.fn(),
  },
  apiQuery: {},
}));

jest.mock('expo-router', () => {
  const push = jest.fn();
  return {
    useRouter: () => ({ push }),
    useNavigation: () => ({ setOptions: jest.fn() }),
  };
});

const mockedApi = apiClient as unknown as {
  listTodayChallenges: jest.Mock;
  listMyMatches: jest.Mock;
  me: jest.Mock;
  startChallenge: jest.Mock;
  completeChallenge: jest.Mock;
};

function challenge(overrides: Partial<TodayChallenge> = {}): TodayChallenge {
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

function renderChallenges() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });

  function wrap(ui: ReactElement) {
    return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
  }

  const view = render(wrap(<ChallengesScreen />));

  return {
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
  mockedApi.listTodayChallenges.mockResolvedValue({
    dayKey: '2026-08-28',
    challenges: [challenge()],
    completedCount: 0,
    totalCount: 1,
  });
  mockedApi.listMyMatches.mockResolvedValue({ live: [], ended: [] });
  mockedApi.me.mockResolvedValue({ hasMembership: false });
});

describe('ChallengesScreen', () => {
  it('opens challenge details from the card, not only Start', async () => {
    const { cleanup } = renderChallenges();

    fireEvent.press(await screen.findByTestId('open-challenge-c1'));

    expect(useRouter().push).toHaveBeenCalledWith('/challenge/c1');
    expect(mockedApi.startChallenge).not.toHaveBeenCalled();

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

    const { cleanup } = renderChallenges();

    fireEvent.press(await screen.findByTestId('advance-challenge-uc-bp'));

    expect(useRouter().push).toHaveBeenCalledWith('/challenge/c-bp/log');
    expect(mockedApi.completeChallenge).not.toHaveBeenCalled();

    await cleanup();
  });

  it('opens the confirm screen for a check-in instead of completing on the card', async () => {
    const { cleanup } = renderChallenges();

    fireEvent.press(await screen.findByTestId('advance-challenge-uc1'));

    expect(useRouter().push).toHaveBeenCalledWith('/challenge/c1/confirm');
    expect(mockedApi.startChallenge).not.toHaveBeenCalled();

    await cleanup();
  });

  it('keeps finished challenges tucked away until they ask', async () => {
    mockedApi.listTodayChallenges.mockResolvedValue({
      dayKey: '2026-08-28',
      challenges: [
        challenge({ id: 'uc-open', title: 'Walk 20 minutes' }),
        challenge({
          id: 'uc-done',
          challengeId: 'c-done',
          title: 'Drink water',
          status: 'completed',
        }),
      ],
      completedCount: 1,
      totalCount: 2,
    });

    const { cleanup } = renderChallenges();

    expect(await screen.findByText("Today's win · 1 of 2")).toBeOnTheScreen();
    expect(screen.getByText('Do next')).toBeOnTheScreen();
    expect(screen.getByText('Walk 20 minutes')).toBeOnTheScreen();
    expect(screen.queryByText('Drink water')).toBeNull();

    fireEvent.press(screen.getByTestId('show-done-challenges'));

    expect(screen.getByText('Drink water')).toBeOnTheScreen();
    expect(screen.getByTestId('section-done')).toBeOnTheScreen();

    await cleanup();
  });

  it('shows one focus, up next, and collapsed cadence groups', async () => {
    mockedApi.listTodayChallenges.mockResolvedValue({
      dayKey: '2026-08-28',
      challenges: [
        challenge({
          id: 'uc-week',
          challengeId: 'c-week',
          title: 'Weekly weigh-in',
          frequency: 'weekly',
          status: 'pending',
        }),
        challenge({
          id: 'uc-pending',
          title: 'Drink water',
          status: 'pending',
        }),
        challenge({
          id: 'uc-progress',
          challengeId: 'c-progress',
          title: 'Check blood pressure',
          status: 'in_progress',
          completionKind: 'vitals_bp',
        }),
        challenge({
          id: 'uc-extra',
          challengeId: 'c-extra',
          title: 'Stretch',
          status: 'pending',
        }),
        challenge({
          id: 'uc-parked',
          challengeId: 'c-parked',
          title: 'Yoga',
          status: 'pending',
        }),
      ],
      completedCount: 0,
      totalCount: 5,
    });

    const { cleanup } = renderChallenges();

    expect(await screen.findByText("Today's win · 0 of 2")).toBeOnTheScreen();
    expect(screen.getByTestId('section-focus')).toBeOnTheScreen();
    expect(screen.getByText('Check blood pressure')).toBeOnTheScreen();
    expect(screen.getByTestId('section-up-next')).toBeOnTheScreen();
    expect(screen.queryByText('Yoga')).toBeNull();
    expect(screen.queryByText('Weekly weigh-in')).toBeNull();

    fireEvent.press(screen.getByTestId('section-also-toggle'));
    expect(screen.getByText('Yoga')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('section-weekly-toggle'));
    expect(screen.getByText('Weekly weigh-in')).toBeOnTheScreen();

    await cleanup();
  });

  it('offers a match entry when none are live', async () => {
    const { cleanup } = renderChallenges();

    expect(await screen.findByTestId('challenges-open-matches')).toBeOnTheScreen();
    expect(screen.getByText('Challenge a friend')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('challenges-open-matches'));
    expect(useRouter().push).toHaveBeenCalledWith('/matches');

    await cleanup();
  });

  it('hides the challenges match entry while a match is live', async () => {
    mockedApi.listMyMatches.mockResolvedValue({
      live: [
        {
          id: 'm1',
          title: 'vs Bee',
          metric: 'pushups',
          scoringMode: 'best_single',
          endsAt: '2026-09-05T21:00:00.000Z',
          status: 'open',
          participantCount: 2,
          yourBestCount: 12,
          yourRank: 1,
        },
      ],
      ended: [],
    });

    const { cleanup } = renderChallenges();

    expect(await screen.findByTestId('open-challenge-c1')).toBeOnTheScreen();
    expect(screen.queryByTestId('challenges-open-matches')).toBeNull();

    await cleanup();
  });
});
