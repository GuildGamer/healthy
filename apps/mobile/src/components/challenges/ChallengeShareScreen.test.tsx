import { darkDeckCards } from '@product/brand';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Metrics } from 'react-native-safe-area-context';
import { apiClient } from '@/lib/api';
import { trackEvent } from '@/lib/track-event';
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
    getGymSharePhoto: jest.fn(async () => ({ photoUrl: null })),
    getActivityRun: jest.fn(async () => ({ runDays: 3 })),
  },
  apiQuery: {},
}));

jest.mock('@/lib/track-event', () => ({
  trackEvent: jest.fn(),
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
  source: { kind: 'reps', count: 22, metric: 'pushups' },
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
  extras: {
    routePoints?: { latitude: number; longitude: number }[];
    clipId?: string | null;
    photoUri?: string;
  } = {},
) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  if (extras.clipId) {
    client.setQueryData(['proof-clip-local', extras.clipId], {
      clipId: extras.clipId,
      fileUri: 'file:///clip.mp4',
      socialFileUri: 'file:///social.mp4',
      posterUri: 'file:///poster.jpg',
      displayCode: '42BW-A7J4',
    });
  }
  const view = render(
    <QueryClientProvider client={client}>
      <SafeAreaProvider initialMetrics={safeArea}>
        <ChallengeShareScreen
          clipId={extras.clipId}
          friend={friend}
          photoUri={extras.photoUri}
          poster={poster}
          routePoints={extras.routePoints}
          userChallengeId={friend.userChallengeId}
        />
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

jest.mock('@/components/matches/share-destination', () => ({
  openShareDestination: jest.fn(async () => undefined),
}));

jest.mock('@/lib/proof-clip-store', () => ({
  getLocalProofClip: jest.fn(async (clipId: string) =>
    clipId === 'clip-1'
      ? {
          clipId: 'clip-1',
          fileUri: 'file:///clip.mp4',
          socialFileUri: 'file:///social.mp4',
          posterUri: 'file:///poster.jpg',
          displayCode: '42BW-A7J4',
        }
      : null,
  ),
}));

describe('ChallengeShareScreen with a clip', () => {
  it('pages video then poster; colours only on the poster; Share sheet matches the page', async () => {
    const { openShareDestination } = jest.requireMock(
      '@/components/matches/share-destination',
    ) as { openShareDestination: jest.Mock };
    const { Dimensions } = require('react-native') as typeof import('react-native');
    const pageWidth = Dimensions.get('window').width - 32;

    renderShare(pushups, { ...pushupFriend, isEligible: false }, { clipId: 'clip-1' });

    expect(await screen.findByTestId('clip-finish-pager')).toBeOnTheScreen();
    expect(screen.queryByTestId('share-fill-carousel')).toBeNull();
    fireEvent.press(screen.getByTestId('set-share-open'));
    fireEvent.press(await screen.findByTestId('share-dest-overflow'));

    await waitFor(() => {
      expect(openShareDestination).toHaveBeenCalledWith(
        'overflow',
        expect.objectContaining({
          artifact: expect.objectContaining({
            kind: 'video',
            clipUri: 'file:///clip.mp4',
          }),
        }),
      );
    });

    fireEvent(screen.getByTestId('clip-finish-list'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: pageWidth, y: 0 } },
    });

    expect(await screen.findByTestId('share-fill-carousel')).toBeOnTheScreen();
    expect(screen.getByTestId('clip-finish-poster')).toBeOnTheScreen();
    openShareDestination.mockClear();
    fireEvent.press(screen.getByTestId('set-share-open'));
    fireEvent.press(await screen.findByTestId('share-dest-overflow'));

    await waitFor(() => {
      expect(openShareDestination).toHaveBeenCalledWith(
        'overflow',
        expect.objectContaining({
          artifact: expect.objectContaining({ kind: 'image' }),
        }),
      );
    });
  });

  it('stays poster-only when no clipId is passed', async () => {
    renderShare(pushups, { ...pushupFriend, isEligible: false });

    expect(await screen.findByTestId('share-poster')).toBeOnTheScreen();
    expect(screen.getByTestId('share-fill-carousel')).toBeOnTheScreen();
    expect(screen.getByTestId('set-share-open')).toBeOnTheScreen();
    expect(screen.queryByTestId('clip-finish-pager')).toBeNull();
  });

  it('puts the gym selfie on the card instead of paging to it', async () => {
    const gym: SharePoster = {
      kind: 'gym',
      label: 'Gym session',
      value: '08:00',
      unit: 'at the gym',
      when: '2026-10-23T08:00:00.000Z',
    };
    renderShare(
      gym,
      { source: { kind: 'day' }, userChallengeId: 'uc-gym', isEligible: false },
      { photoUri: 'file://gym.jpg' },
    );

    expect(await screen.findByTestId('clip-finish-pager')).toBeOnTheScreen();
    expect(screen.getByTestId('gym-photo-share-image')).toHaveProp('source', {
      uri: 'file://gym.jpg',
    });
    expect(screen.getByTestId('clip-finish-poster')).toBeOnTheScreen();
    expect(screen.getByTestId('share-fill-photo')).toBeOnTheScreen();
  });
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

  it('lets you recolour the poster before share', async () => {
    renderShare(pushups, { ...pushupFriend, isEligible: false });

    expect(await screen.findByTestId('share-fill-carousel')).toBeOnTheScreen();
    expect(screen.getByTestId('share-fill-strength').props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );

    fireEvent.press(screen.getByTestId('share-fill-walk'));
    const root = screen.getByTestId('share-poster-image');
    const fillChild = root.children.find(
      (child: unknown): child is { props: { style?: unknown } } =>
        typeof child !== 'string' && child != null && typeof child === 'object',
    );
    expect(StyleSheet.flatten(fillChild?.props.style)?.backgroundColor).toBe(darkDeckCards.walk);
  });
});

describe('ChallengeShareScreen friend invite', () => {
  it('offers treatment the quiet invite and seeds a past push-up set', async () => {
    mockedApi.getExperimentAssignment.mockResolvedValue(assignment('treatment'));
    mockedApi.createMatch.mockResolvedValue({
      match: { id: 'm1', yourScore: 22 },
      invite: { token: 't', url: 'https://invite.example/m1' },
    });
    const view = renderShare(pushups, pushupFriend);

    expect(await screen.findByTestId('share-poster')).toBeOnTheScreen();
    fireEvent.press(await screen.findByTestId('set-share-open'));
    fireEvent.press(await screen.findByTestId('share-dest-challenge'));

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
      expect(trackEvent).toHaveBeenCalledWith(
        'challenge_cta_viewed',
        expect.objectContaining({ experiment_variant: 'treatment' }),
      );
    });
    const { useRouter } = jest.requireMock('expo-router') as {
      useRouter: () => { push: jest.Mock };
    };
    await waitFor(() =>
      expect(useRouter().push).toHaveBeenCalledWith({
        pathname: '/matches/[matchId]',
        params: { matchId: 'm1', shareInvite: '1' },
      }),
    );
    expect(JSON.stringify(mockedApi.createMatch.mock.calls)).not.toMatch(/128|Sam/);
    await view.settle();
  });

  it('still offers challenge-a-friend when the assignment is control', async () => {
    mockedApi.getExperimentAssignment.mockResolvedValue(assignment('control'));
    const view = renderShare(pushups, pushupFriend);

    expect(await screen.findByTestId('share-poster')).toBeOnTheScreen();
    fireEvent.press(await screen.findByTestId('set-share-open'));
    expect(await screen.findByTestId('share-dest-challenge')).toBeOnTheScreen();
    await view.settle();
  });

  it('starts a week of finished days from a past reading, with no numbers on the invite', async () => {
    mockedApi.getExperimentAssignment.mockResolvedValue(assignment('treatment'));
    mockedApi.createMatch.mockResolvedValue({
      match: { id: 'm2', yourScore: 0 },
      invite: { token: 't', url: 'https://invite.example/m2' },
    });
    const view = renderShare(reading, readingFriend);

    fireEvent.press(await screen.findByTestId('set-share-open'));
    fireEvent.press(await screen.findByTestId('share-dest-challenge'));

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
    const { useRouter } = jest.requireMock('expo-router') as {
      useRouter: () => { push: jest.Mock };
    };
    await waitFor(() =>
      expect(useRouter().push).toHaveBeenCalledWith({
        pathname: '/matches/[matchId]',
        params: { matchId: 'm2', shareInvite: '1' },
      }),
    );
    const sent = JSON.stringify(mockedApi.createMatch.mock.calls);
    expect(sent).not.toMatch(/128|82|70|mmol|Sam|blood pressure/i);
    await view.settle();
  });
});
