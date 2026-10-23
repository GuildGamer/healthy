import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Metrics } from 'react-native-safe-area-context';
import { apiClient } from '@/lib/api';
import { ChallengeShareScreen } from './ChallengeShareScreen';
import type { ShareFriend } from './types/friend-challenge';
import type { SharePoster } from './types/share-poster';

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    me: jest.fn(async () => ({ currentStreakDays: 3 })),
    getExperimentAssignment: jest.fn(async () => null),
    createMatch: jest.fn(),
    trackAnalyticsEvent: jest.fn(async () => ({ ok: true })),
  },
  apiQuery: {},
}));

jest.mock('expo-router', () => {
  const push = jest.fn();
  return {
    useRouter: () => ({ push }),
    router: { push, canDismiss: () => true, dismiss: jest.fn(), replace: jest.fn() },
  };
});

const mockedApi = apiClient as unknown as {
  getExperimentAssignment: jest.Mock;
  createMatch: jest.Mock;
  trackAnalyticsEvent: jest.Mock;
};

const safeArea: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const pushups: SharePoster = {
  kind: 'strength',
  label: 'Do 20 push-ups',
  value: '22',
  unit: 'push-ups',
  when: '2026-10-20T09:15:00.000Z',
};

const pushupFriend: ShareFriend = {
  source: { kind: 'reps', count: 22 },
  userChallengeId: 'uc-push',
  isEligible: true,
};

const reading: SharePoster = {
  kind: 'bloodPressure',
  label: 'Check your blood pressure',
  value: 'Logged',
  unit: '20 Oct',
  when: '2026-10-20T09:15:00.000Z',
};

const readingFriend: ShareFriend = {
  source: { kind: 'day' },
  userChallengeId: 'uc-bp',
  isEligible: true,
};

function assignment(variantKey: 'treatment' | 'control') {
  return {
    experimentId: 'exp1',
    experimentKey: 'challenge_referral_v1',
    variantId: 'v1',
    variantKey,
    configuration: null,
    assignedAt: '2026-10-22T00:00:00.000Z',
  };
}

function renderShare(
  poster: SharePoster,
  friend: ShareFriend,
  extras: { routePoints?: { latitude: number; longitude: number }[] } = {},
) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  const view = render(
    <QueryClientProvider client={client}>
      <SafeAreaProvider initialMetrics={safeArea}>
        <ChallengeShareScreen friend={friend} poster={poster} routePoints={extras.routePoints} />
      </SafeAreaProvider>
    </QueryClientProvider>,
  );

  return {
    ...view,
    settle: () => waitFor(() => expect(client.isFetching() + client.isMutating()).toBe(0)),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ChallengeShareScreen route poster', () => {
  it('shows the walk path silhouette when route points are handed in', async () => {
    const walk: SharePoster = {
      kind: 'walk',
      label: 'Morning walk',
      value: '28',
      unit: 'minutes walked',
      when: '2026-10-23T08:00:00.000Z',
    };
    renderShare(walk, { source: { kind: 'day' }, userChallengeId: 'uc-walk', isEligible: false }, {
      routePoints: [
        { latitude: 51.5, longitude: -0.13 },
        { latitude: 51.51, longitude: -0.12 },
      ],
    });

    expect(await screen.findByTestId('share-poster-route')).toBeOnTheScreen();
  });
});

describe('ChallengeShareScreen friend invite', () => {
  it('offers treatment the quiet invite and seeds a past push-up set', async () => {
    mockedApi.getExperimentAssignment.mockResolvedValue(assignment('treatment'));
    mockedApi.createMatch.mockResolvedValue({
      match: { id: 'm1', yourScore: 22 },
      invite: { token: 't', url: 'https://invite.example/m1' },
    });
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    const view = renderShare(pushups, pushupFriend);

    expect(await screen.findByTestId('share-poster')).toBeOnTheScreen();
    fireEvent.press(await screen.findByTestId('share-challenge-friend'));

    await waitFor(() => {
      expect(mockedApi.createMatch).toHaveBeenCalledWith({
        metric: 'pushups',
        scoringMode: 'best_single',
        window: 'today',
        seedCount: 22,
        sourceUserChallengeId: 'uc-push',
        parentMatchId: undefined,
        experimentId: 'exp1',
        experimentVariantKey: 'treatment',
      });
    });
    expect(mockedApi.getExperimentAssignment).toHaveBeenCalledWith({
      experimentKey: 'challenge_referral_v1',
    });
    await waitFor(() => {
      expect(mockedApi.trackAnalyticsEvent).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'challenge_cta_viewed' }),
      );
    });
    expect(share).toHaveBeenCalled();
    expect(JSON.stringify(mockedApi.createMatch.mock.calls)).not.toMatch(/128|Sam/);
    share.mockRestore();
    await view.settle();
  });

  it('hides the invite from the control arm and still leaves Share in place', async () => {
    mockedApi.getExperimentAssignment.mockResolvedValue(assignment('control'));
    const view = renderShare(pushups, pushupFriend);

    expect(await screen.findByTestId('share-poster')).toBeOnTheScreen();
    await waitFor(() => expect(mockedApi.getExperimentAssignment).toHaveBeenCalled());
    expect(screen.queryByTestId('share-challenge-friend')).toBeNull();
    expect(mockedApi.createMatch).not.toHaveBeenCalled();
    expect(mockedApi.trackAnalyticsEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ name: 'challenge_cta_viewed' }),
    );
    await view.settle();
  });

  it('starts a week of finished days from a past reading, with no numbers on the invite', async () => {
    mockedApi.getExperimentAssignment.mockResolvedValue(assignment('treatment'));
    mockedApi.createMatch.mockResolvedValue({
      match: { id: 'm2', yourScore: 0 },
      invite: { token: 't', url: 'https://invite.example/m2' },
    });
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    const view = renderShare(reading, readingFriend);

    fireEvent.press(await screen.findByTestId('share-challenge-friend'));

    await waitFor(() => {
      expect(mockedApi.createMatch).toHaveBeenCalledWith({
        metric: 'walk',
        scoringMode: 'days_completed',
        dailyScope: 'any_challenge',
        window: 'week',
        sourceUserChallengeId: 'uc-bp',
        parentMatchId: undefined,
        experimentId: 'exp1',
        experimentVariantKey: 'treatment',
      });
    });
    await waitFor(() => expect(share).toHaveBeenCalled());
    const sent = JSON.stringify({
      create: mockedApi.createMatch.mock.calls,
      share: share.mock.calls,
    });
    expect(sent).not.toMatch(/128|82|70|mmol|Sam|blood pressure/i);
    share.mockRestore();
    await view.settle();
  });
});
