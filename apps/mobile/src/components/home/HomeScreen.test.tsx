import type { MeOutput } from '@product/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import type { ReactElement } from 'react';
import { Share } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Metrics } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { DECK_DONE_FACE_MS } from '@/components/deck';
import { apiClient } from '@/lib/api';
import { HomeScreen } from './HomeScreen';
import {
  liveGroup,
  occurrenceDetail,
  todayChallenge,
  todayDetails,
} from './testing/today-fixtures';

/** `useSafeAreaInsets` throws without a provider, and native metrics are async. */
const testSafeAreaMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    me: jest.fn(),
    getHomeBootstrap: jest.fn(),
    listTodayChallenges: jest.fn(),
    getTodayDetails: jest.fn(),
    listNotifications: jest.fn(),
    listLeaderboard: jest.fn(),
    startChallenge: jest.fn(),
    completeChallenge: jest.fn(),
    saveChallengeDraft: jest.fn(),
    getExperimentAssignment: jest.fn(async () => null),
    trackAnalyticsEvent: jest.fn(async () => ({ ok: true })),
    updateTimeZone: jest.fn(),
    listTips: jest.fn(),
    listMyMatches: jest.fn(),
    listChallengeCatalog: jest.fn(),
    setChallengeEnrollment: jest.fn(),
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
  const { useEffect } = require('react');
  const push = jest.fn();
  const navigate = jest.fn();
  return {
    useRouter: () => ({ push, navigate }),
    router: { push, replace: jest.fn(), canDismiss: () => false, dismiss: jest.fn() },
    useFocusEffect: (effect: () => void | (() => void)) => {
      useEffect(effect, [effect]);
    },
  };
});

const mockedApi = apiClient as unknown as Record<keyof typeof apiClient, jest.Mock>;

const pushups = {
  kind: 'device_session',
  metric: 'pushups',
  target: { durationMinutes: null, distanceMeters: null, count: 20 },
} as const;

function me(overrides: Partial<MeOutput> = {}): MeOutput {
  return {
    id: 'u1',
    email: 'ada@example.com',
    name: 'Ada Lovelace',
    categories: ['hypertension'],
    pointsBalance: 150,
    currentStreakDays: 7,
    streakLapsedYesterday: false,
    bestStreakDays: 7,
    // Matches the device zone under test, so no sync request is triggered.
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    countryCode: null,
    displayName: 'Ada',
    reminderEnabled: false,
    reminderMinute: 1140,
    evidenceRemindersEnabled: true,
    promotionalMessagesEnabled: false,
    showOnLeaderboard: true,
    groupNotificationsEnabled: true,
    inProgressNudgeEnabled: true,
    inProgressNudgeDelayMinutes: 30,
    healthLinkStatus: 'unknown',
    hasMembership: true,
    maxRemindersPerChallenge: 1,
    proofClipAudience: null,
    ...overrides,
  };
}

function givenChallenges(challenges: ReturnType<typeof todayChallenge>[]) {
  const today = {
    dayKey: '2026-08-28',
    challenges,
    completedCount: challenges.filter((item) => item.status === 'completed').length,
    totalCount: challenges.length,
  };
  mockedApi.listTodayChallenges.mockResolvedValue(today);
  mockedApi.getHomeBootstrap.mockImplementation(async () => ({
    me: await mockedApi.me(),
    today,
    details: await mockedApi.getTodayDetails(),
  }));
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
    cleanup: async () => {
      await waitFor(() => {
        expect(client.isFetching()).toBe(0);
      });
      view.unmount();
      client.clear();
    },
  };
}

function dealNext() {
  fireEvent(screen.getByTestId('home-deck-dots'), 'accessibilityAction', {
    nativeEvent: { actionName: 'increment' },
  });
}

function dealPrevious() {
  fireEvent(screen.getByTestId('home-deck-dots'), 'accessibilityAction', {
    nativeEvent: { actionName: 'decrement' },
  });
}

/** The card peeking behind the top one, which is hidden from assistive tech. */
function underCard() {
  return screen.queryByTestId('home-deck-under', { includeHiddenElements: true });
}

async function expectStackAt(topTitle: string, underTitle: string | null) {
  await waitFor(() =>
    expect(within(screen.getByTestId('home-deck-top')).getByText(topTitle)).toBeOnTheScreen(),
  );

  if (underTitle === null) {
    expect(underCard()).toBeNull();
    return;
  }

  const under = underCard();
  expect(under).not.toBeNull();
  expect(within(under!).getByText(underTitle, { includeHiddenElements: true })).toBeTruthy();
  // At rest the card behind is tucked and dimmed, not stacked flush behind the top one.
  await waitFor(() => expect(under).toHaveStyle({ opacity: 0.7 }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedApi.me.mockResolvedValue(me());
  mockedApi.listNotifications.mockResolvedValue({ notifications: [], unreadCount: 0 });
  givenChallenges([]);
  mockedApi.getTodayDetails.mockResolvedValue(todayDetails([]));
  mockedApi.listTips.mockResolvedValue({
    tips: [
      {
        id: 'salt',
        category: 'hypertension',
        title: 'Reduce salt today for better blood pressure',
        body: 'Most sodium comes from packaged food.',
      },
    ],
  });
  mockedApi.listLeaderboard.mockResolvedValue({
    weekStart: '2026-08-24',
    period: 'week',
    periodStart: '2026-08-24',
    entries: [],
    currentUserRank: 4,
    currentUserRankAtDayStart: 6,
    currentUserPoints: 150,
    currentUserVisible: true,
  });
  mockedApi.listMyMatches.mockResolvedValue({ live: [], ended: [] });
  mockedApi.listChallengeCatalog.mockResolvedValue({
    challenges: [],
    enrolledCount: 0,
    hasMembership: false,
    maxRemindersPerChallenge: 1,
  });
});

describe('HomeScreen', () => {
  it('heads the day with its name, the tally and the run', async () => {
    givenChallenges([
      todayChallenge({ id: 'uc1', title: 'Alpha' }),
      todayChallenge({ id: 'uc2', title: 'Beta', status: 'completed', rewardPoints: 150 }),
    ]);
    const { cleanup } = renderHome();

    expect(await screen.findByText('Alpha')).toBeOnTheScreen();
    expect(screen.getByText('7 days running')).toBeOnTheScreen();
    expect(screen.getByText('1 done')).toBeOnTheScreen();
    expect(screen.getByText('2 of 2')).toBeOnTheScreen();
    expect(screen.getByTestId('home-done-uc2')).toBeOnTheScreen();
    expect(screen.getByText('+150')).toBeOnTheScreen();
    expect(screen.queryByText('Rank 4 this week')).toBeNull();

    await cleanup();
  });

  it('starts another set from a finished push-up chip, and opens other finished ones', async () => {
    givenChallenges([
      todayChallenge({ id: 'uc1', title: 'Alpha' }),
      todayChallenge({
        id: 'uc-push',
        challengeId: 'push',
        title: 'Do 20 push-ups',
        status: 'completed',
        capture: pushups,
      }),
      todayChallenge({ id: 'uc-walk', challengeId: 'walk', title: 'Walk', status: 'completed' }),
    ]);
    const { cleanup } = renderHome();

    expect(await screen.findByTestId('home-done-again-uc-push')).toBeOnTheScreen();
    expect(screen.queryByTestId('home-done-again-uc-walk')).toBeNull();

    fireEvent.press(screen.getByTestId('home-done-uc-push'));
    expect(useRouter().push).toHaveBeenCalledWith('/challenge/push/practice');

    fireEvent.press(screen.getByTestId('home-done-uc-walk'));
    expect(useRouter().push).toHaveBeenCalledWith('/challenge/walk');

    await cleanup();
  });

  it('sends another set to the open group contest instead of practice', async () => {
    mockedApi.listMyMatches.mockResolvedValue({
      live: [
        liveGroup({
          id: 'm-push',
          metric: 'pushups',
          scoringMode: 'cumulative_total',
        }),
      ],
      ended: [],
    });
    givenChallenges([
      todayChallenge({ id: 'uc-open', title: 'Still open' }),
      todayChallenge({
        id: 'uc-push',
        challengeId: 'push',
        title: 'Do 20 push-ups',
        status: 'completed',
        capture: pushups,
      }),
    ]);
    const { cleanup } = renderHome();

    expect(await screen.findByTestId('home-done-again-uc-push')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('home-done-uc-push'));
    expect(useRouter().push).toHaveBeenCalledWith('/matches/m-push/pose');

    await cleanup();
  });

  it('opens the inbox from the avatar, which carries the unread count', async () => {
    mockedApi.listNotifications.mockResolvedValue({ notifications: [], unreadCount: 2 });
    const { cleanup } = renderHome();

    fireEvent.press(await screen.findByLabelText('2 unread notifications'));
    expect(useRouter().push).toHaveBeenCalledWith('/notifications');
    expect(screen.getByTestId('home-unread-dot')).toBeOnTheScreen();
    // The inbox is a bell, never your initials or photo.
    expect(screen.getByTestId('home-inbox-bell')).toBeOnTheScreen();
    expect(screen.queryByTestId('home-profile-avatar')).toBeNull();
    expect(screen.getByTestId('open-notifications')).not.toHaveTextContent('A');

    await cleanup();
  });

  it('shows a still skeleton of the deck while today loads', async () => {
    let resolveBootstrap: (value: unknown) => void = () => undefined;
    mockedApi.getHomeBootstrap.mockReturnValue(
      new Promise((resolve) => {
        resolveBootstrap = resolve;
      }),
    );
    const { cleanup } = renderHome();

    expect(await screen.findByTestId('home-deck-loading')).toBeOnTheScreen();
    resolveBootstrap({
      me: me(),
      today: { dayKey: '2026-08-28', challenges: [], completedCount: 0, totalCount: 0 },
      details: todayDetails([]),
    });
    expect(await screen.findByText('Nothing on today yet.')).toBeOnTheScreen();

    await cleanup();
  });

  it('puts one calm card in the deck when today fails to load', async () => {
    mockedApi.getHomeBootstrap.mockRejectedValueOnce(new Error('offline'));
    const { cleanup } = renderHome();

    expect(await screen.findByText('Today didn’t load.')).toBeOnTheScreen();
    givenChallenges([todayChallenge({ title: 'Alpha' })]);
    fireEvent.press(screen.getByTestId('home-retry'));
    expect(await screen.findByText('Alpha')).toBeOnTheScreen();

    await cleanup();
  });

  it('draws the empty deck with two suggestions and adds one on tap', async () => {
    mockedApi.listChallengeCatalog.mockResolvedValue({
      challenges: [
        {
          challengeId: 'c-water',
          slug: 'water',
          title: 'Log your water',
          description: '',
          category: 'hypertension',
          rewardPoints: 100,
          sortOrder: 100,
          frequency: 'daily',
          completionKind: 'water',
          instruction: '',
          icon: 'cup-water',
          isEnrolled: false,
          requiresMembership: false,
          isLocked: false,
          reminders: [],
          capture: {
            kind: 'structured_log',
            metric: null,
            target: { durationMinutes: null, distanceMeters: null, count: null },
          },
        },
      ],
      enrolledCount: 0,
      hasMembership: false,
      maxRemindersPerChallenge: 1,
    });
    mockedApi.setChallengeEnrollment.mockResolvedValue({});
    const { cleanup } = renderHome();

    expect(await screen.findByText('Nothing on today yet.')).toBeOnTheScreen();
    fireEvent.press(await screen.findByTestId('home-suggest-c-water'));
    await waitFor(() =>
      expect(mockedApi.setChallengeEnrollment).toHaveBeenCalledWith({
        challengeId: 'c-water',
        isEnrolled: true,
      }),
    );

    fireEvent.press(screen.getByTestId('home-choose-challenges'));
    expect(useRouter().push).toHaveBeenCalledWith('/manage-challenges');

    await cleanup();
  });

  it('says a missed day once, as a sentence, and keeps the best run in the tally', async () => {
    mockedApi.me.mockResolvedValue(
      me({ currentStreakDays: 0, streakLapsedYesterday: true, bestStreakDays: 12 }),
    );
    givenChallenges([todayChallenge({ title: 'Alpha' })]);
    const { cleanup } = renderHome();

    expect(await screen.findByTestId('home-lapsed')).toHaveTextContent(
      'Yesterday slipped. Today starts a new run.',
    );
    expect(screen.getByText('Best run 12 days')).toBeOnTheScreen();

    await cleanup();
  });

  it('says when a reading was last logged and shows a set part done', async () => {
    givenChallenges([
      todayChallenge({
        id: 'uc-bp',
        completionKind: 'vitals_bp',
        category: 'hypertension',
        capture: {
          kind: 'structured_log',
          metric: null,
          target: { durationMinutes: null, distanceMeters: null, count: null },
        },
      }),
      todayChallenge({ id: 'uc-set', challengeId: 'c-set', title: 'Push-ups', capture: pushups }),
    ]);
    mockedApi.getTodayDetails.mockResolvedValue(
      todayDetails([
        occurrenceDetail({ userChallengeId: 'uc-bp', lastCompletedDayKey: '2026-08-24' }),
        occurrenceDetail({ userChallengeId: 'uc-set', bestMeasuredInPeriod: 14 }),
      ]),
    );
    const { cleanup } = renderHome();

    expect(await screen.findByText('Last reading Monday')).toBeOnTheScreen();
    dealNext();
    expect(await screen.findByText('14')).toBeOnTheScreen();
    expect(screen.getByText('of 20 reps')).toBeOnTheScreen();

    await cleanup();
  });

  it('draws the week on a weekly card', async () => {
    givenChallenges([todayChallenge({ id: 'uc-week', frequency: 'weekly' })]);
    mockedApi.getTodayDetails.mockResolvedValue(
      todayDetails([
        occurrenceDetail({ userChallengeId: 'uc-week', activeDayKeys: ['2026-08-25'] }),
      ]),
    );
    const { cleanup } = renderHome();

    expect(await screen.findByTestId('deck-week-strip')).toBeOnTheScreen();
    expect(screen.getByTestId('deck-week-hit-2026-08-25')).toBeOnTheScreen();
    expect(screen.getByText('THIS WEEK')).toBeOnTheScreen();

    await cleanup();
  });

  it('deals the top card with its verb and proof, and opens the right screen', async () => {
    givenChallenges([
      todayChallenge({
        id: 'uc-bp',
        challengeId: 'c-bp',
        completionKind: 'vitals_bp',
        category: 'hypertension',
        title: 'Check your blood pressure',
        capture: {
          kind: 'structured_log',
          metric: null,
          target: { durationMinutes: null, distanceMeters: null, count: null },
        },
      }),
    ]);
    const { cleanup } = renderHome();

    expect(await screen.findByText('Not yet today')).toBeOnTheScreen();
    expect(screen.getByText('You enter the reading')).toBeOnTheScreen();
    expect(screen.getByTestId('deck-card-tip')).toHaveTextContent(/Reduce salt/);

    fireEvent.press(screen.getByText('Log reading'));
    expect(useRouter().push).toHaveBeenCalledWith('/challenge/c-bp/log');
    expect(mockedApi.completeChallenge).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('open-challenge-c-bp'));
    expect(useRouter().push).toHaveBeenCalledWith('/challenge/c-bp');

    await cleanup();
  });

  it('marks a check-in done on the card and turns it over', async () => {
    const stretch = todayChallenge({
      id: 'uc-stretch',
      challengeId: 'c-stretch',
      title: 'Stretch before bed',
    });
    const water = todayChallenge({
      id: 'uc-water',
      challengeId: 'c-water',
      title: 'Log your water',
      sortOrder: 200,
    });
    givenChallenges([stretch, water]);
    mockedApi.startChallenge.mockResolvedValue({
      challenge: { ...stretch, status: 'in_progress' },
    });
    mockedApi.completeChallenge.mockResolvedValue({
      challenge: { ...stretch, status: 'completed' },
      pointsBalance: 100,
      currentStreakDays: 1,
      pointsAwarded: 100,
      evidenceRequest: null,
      penaltyApplied: 0,
    });
    const { cleanup } = renderHome();

    fireEvent.press(await screen.findByText('Mark as done'));

    expect(await screen.findByTestId('finished-challenge-c-stretch')).toHaveTextContent(/Done\./);
    expect(screen.getByText('Stretch before bed · +100 points')).toBeOnTheScreen();
    expect(screen.queryByTestId('done-face-share')).toBeNull();
    expect(useRouter().push).not.toHaveBeenCalledWith('/challenge/c-stretch/confirm');

    await cleanup();
  });

  it('offers the treatment arm a quiet Challenge a friend on the done side, which stays up', async () => {
    const stretch = todayChallenge({
      id: 'uc-stretch',
      challengeId: 'c-stretch',
      title: 'Stretch before bed',
    });
    const water = todayChallenge({
      id: 'uc-water',
      challengeId: 'c-water',
      title: 'Log your water',
      sortOrder: 200,
    });
    givenChallenges([stretch, water]);
    mockedApi.getExperimentAssignment.mockResolvedValue({
      experimentId: 'exp1',
      experimentKey: 'challenge_referral_v1',
      variantId: 'v1',
      variantKey: 'treatment',
      configuration: null,
      assignedAt: new Date().toISOString(),
    });
    mockedApi.startChallenge.mockResolvedValue({
      challenge: { ...stretch, status: 'in_progress' },
    });
    mockedApi.completeChallenge.mockResolvedValue({
      challenge: { ...stretch, status: 'completed' },
      pointsBalance: 100,
      currentStreakDays: 1,
      pointsAwarded: 100,
      evidenceRequest: null,
      penaltyApplied: 0,
    });
    jest.useFakeTimers();
    try {
      const { cleanup } = renderHome();

      fireEvent.press(await screen.findByText('Mark as done'));

      expect(await screen.findByTestId('done-face-challenge-friend')).toHaveTextContent(
        'Challenge a friend',
      );
      act(() => {
        jest.advanceTimersByTime(DECK_DONE_FACE_MS * 2);
      });
      expect(screen.getByTestId('finished-challenge-c-stretch')).toBeOnTheScreen();

      await cleanup();
    } finally {
      jest.useRealTimers();
      mockedApi.getExperimentAssignment.mockResolvedValue(null);
    }
  });

  it('opens the full Well done page when the last challenge of the day is done', async () => {
    const stretch = todayChallenge({
      id: 'uc-stretch',
      challengeId: 'c-stretch',
      title: 'Stretch before bed',
    });
    givenChallenges([stretch]);
    mockedApi.startChallenge.mockResolvedValue({
      challenge: { ...stretch, status: 'in_progress' },
    });
    mockedApi.completeChallenge.mockResolvedValue({
      challenge: { ...stretch, status: 'completed' },
      pointsBalance: 100,
      currentStreakDays: 4,
      pointsAwarded: 100,
      evidenceRequest: null,
      penaltyApplied: 0,
    });
    const { cleanup } = renderHome();

    fireEvent.press(await screen.findByText('Mark as done'));

    await waitFor(() => {
      expect(useRouter().push).toHaveBeenCalledWith({
        pathname: '/challenge/success',
        params: expect.objectContaining({
          userChallengeId: 'uc-stretch',
          streak: '4',
          metric: 'other',
          day: '1',
        }),
      });
    });
    expect(screen.queryByTestId('finished-challenge-c-stretch')).toBeNull();

    await cleanup();
  });

  it('adds a glass of water on the card and offers to take it back', async () => {
    const water = todayChallenge({
      id: 'uc-water',
      challengeId: 'c-water',
      completionKind: 'water',
      title: 'Log your water',
      status: 'in_progress',
      draft: { kind: 'water', fields: { amount: 2, unit: 'glasses' } },
      capture: {
        kind: 'structured_log',
        metric: null,
        target: { durationMinutes: null, distanceMeters: null, count: null },
      },
    });
    givenChallenges([water]);
    mockedApi.saveChallengeDraft.mockResolvedValue({ challenge: water });
    const { cleanup } = renderHome();

    fireEvent.press(await screen.findByText('Add a glass'));

    expect(await screen.findByText('Third glass logged')).toBeOnTheScreen();
    expect(mockedApi.saveChallengeDraft).toHaveBeenCalledWith({
      userChallengeId: 'uc-water',
      draft: { kind: 'water', fields: { amount: 3, unit: 'glasses' } },
    });
    expect(mockedApi.completeChallenge).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('home-card-toast-action'));

    await waitFor(() => {
      expect(mockedApi.saveChallengeDraft).toHaveBeenLastCalledWith({
        userChallengeId: 'uc-water',
        draft: { kind: 'water', fields: { amount: 2, unit: 'glasses' } },
      });
    });

    await cleanup();
  });

  it('brings work underway to the top with Resume', async () => {
    givenChallenges([
      todayChallenge({ id: 'uc1', title: 'Alpha' }),
      todayChallenge({
        id: 'uc2',
        challengeId: 'c2',
        title: 'Beta',
        status: 'in_progress',
        capture: pushups,
      }),
    ]);
    const { cleanup } = renderHome();

    expect(await screen.findByText('Resume')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('advance-challenge-uc2'));
    expect(useRouter().push).toHaveBeenCalledWith('/challenge/c2/pose');

    await cleanup();
  });

  it('deals the next card without leaving Today and retires the swipe hint', async () => {
    givenChallenges([
      todayChallenge({ id: 'uc1', title: 'Alpha' }),
      todayChallenge({ id: 'uc2', title: 'Beta' }),
    ]);
    const { cleanup } = renderHome();

    expect(await screen.findByText('Alpha')).toBeOnTheScreen();
    expect(await screen.findByTestId('home-swipe-hint')).toBeOnTheScreen();

    dealNext();

    expect(await screen.findByText('Beta')).toBeOnTheScreen();
    expect(screen.queryByText('Alpha')).toBeNull();
    expect(screen.queryByTestId('home-swipe-hint')).toBeNull();
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('today_swipe_hint_seen', 'true');

    await cleanup();
  });

  it('keeps the next card peeking behind after dealing forward and back', async () => {
    givenChallenges([
      todayChallenge({ id: 'uc1', title: 'Alpha' }),
      todayChallenge({ id: 'uc2', title: 'Beta' }),
      todayChallenge({ id: 'uc3', title: 'Gamma' }),
    ]);
    const { cleanup } = renderHome();

    expect(await screen.findByText('Alpha')).toBeOnTheScreen();
    await expectStackAt('Alpha', 'Beta');

    dealNext();
    await expectStackAt('Beta', 'Gamma');

    dealNext();
    await expectStackAt('Gamma', null);

    dealPrevious();
    await expectStackAt('Beta', 'Gamma');

    dealPrevious();
    await expectStackAt('Alpha', 'Beta');

    dealPrevious();
    await expectStackAt('Alpha', 'Beta');

    await cleanup();
  });

  it('folds a finished day into one card with points, rank and tomorrow’s tip', async () => {
    givenChallenges([
      todayChallenge({ id: 'uc1', status: 'completed', rewardPoints: 100 }),
      todayChallenge({ id: 'uc2', status: 'completed', rewardPoints: 150 }),
    ]);
    const { cleanup } = renderHome();

    expect(await screen.findByText('That’s the day.')).toBeOnTheScreen();
    expect(screen.getAllByText('+250')).not.toHaveLength(0);
    expect(await screen.findByText('4th')).toBeOnTheScreen();
    expect(screen.getByText('this week, up 2')).toBeOnTheScreen();
    expect(screen.getByText('7 days in a row.')).toBeOnTheScreen();
    expect(screen.getByText('FOR TOMORROW')).toBeOnTheScreen();
    expect(screen.queryByTestId('home-done-chips')).toBeNull();

    await cleanup();
  });

  it('shares the day as an image of counts only', async () => {
    givenChallenges([
      todayChallenge({
        id: 'uc-bp',
        title: 'Check your blood pressure',
        completionKind: 'vitals_bp',
        status: 'completed',
        rewardPoints: 150,
      }),
    ]);
    const { cleanup } = renderHome();

    const card = await screen.findByTestId('home-day-share-card', { includeHiddenElements: true });
    expect(card).toHaveTextContent(/7days running/);
    expect(card).not.toHaveTextContent(/blood pressure/i);

    fireEvent.press(screen.getByTestId('home-share-day'));
    await waitFor(() =>
      expect(captureRef).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ format: 'png' }),
      ),
    );
    await waitFor(() =>
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        'file://share-card.jpg',
        expect.objectContaining({ mimeType: 'image/png' }),
      ),
    );

    await cleanup();
  });

  it('falls back to a sentence when the image cannot be made', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
    jest.mocked(captureRef).mockRejectedValueOnce(new Error('no window'));
    givenChallenges([todayChallenge({ id: 'uc1', status: 'completed' })]);
    const { cleanup } = renderHome();

    fireEvent.press(await screen.findByTestId('home-share-day'));
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(share.mock.calls[0]?.[0]).toEqual({
      message: 'I finished 1 challenge on Healthy today. 7 days in a row.',
    });

    await cleanup();
  });

  it('locks a free win after two, with extras behind it and one membership line', async () => {
    mockedApi.me.mockResolvedValue(me({ hasMembership: false }));
    givenChallenges([
      todayChallenge({ id: 'uc1', status: 'completed' }),
      todayChallenge({ id: 'uc2', status: 'completed' }),
      todayChallenge({ id: 'uc3', title: 'Gamma' }),
    ]);
    const { cleanup } = renderHome();

    expect(await screen.findByText('Win locked')).toBeOnTheScreen();
    expect(screen.getByText('That’s the day.')).toBeOnTheScreen();
    expect(screen.getByTestId('home-win-line')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('home-membership-line'));
    expect(useRouter().push).toHaveBeenCalledWith('/membership');

    dealNext();
    expect(await screen.findByText('Gamma')).toBeOnTheScreen();
    expect(screen.getByText('EXTRA')).toBeOnTheScreen();

    await cleanup();
  });

  it('deals a live group as a card whose verb is your next set', async () => {
    mockedApi.listMyMatches.mockResolvedValue({ live: [liveGroup()], ended: [] });
    givenChallenges([todayChallenge({ id: 'uc1', status: 'completed' })]);
    mockedApi.me.mockResolvedValue(me({ hasMembership: true }));
    const { cleanup } = renderHome();

    expect(await screen.findByText('That’s the day.')).toBeOnTheScreen();
    dealNext();

    expect(await screen.findByText('Push-ups with Jess and Sam')).toBeOnTheScreen();
    expect(screen.getByTestId('home-roster-jess')).toHaveTextContent(/Jess20/);
    expect(screen.getByTestId('home-roster-u1')).toHaveTextContent(/You14/);
    expect(screen.getByTestId('home-roster-sam')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('home-group-act-m1'));
    expect(useRouter().push).toHaveBeenCalledWith('/matches/m1/pose');

    fireEvent.press(screen.getByTestId('home-group-m1'));
    expect(useRouter().push).toHaveBeenCalledWith('/matches/m1');

    await cleanup();
  });

  it('mentions the latest move in a live group, by name and time only', async () => {
    const movedAt = new Date(Date.now() - 4 * 60_000).toISOString();
    mockedApi.listMyMatches.mockResolvedValue({
      live: [liveGroup({ lastMove: { displayName: 'Jess', image: null, movedAt } })],
      ended: [],
    });
    givenChallenges([todayChallenge({ id: 'uc1' })]);
    const { cleanup } = renderHome();

    expect(await screen.findByTestId('home-presence')).toHaveTextContent(
      /Jess did a set · 4 min ago$/,
    );

    await cleanup();
  });
});
