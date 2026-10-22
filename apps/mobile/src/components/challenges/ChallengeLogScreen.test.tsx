import type { TodayChallenge } from '@product/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import { apiClient } from '@/lib/api';
import { takeChallengeFinish } from '@/lib/challenge-finish-session';
import { ChallengeLogScreen } from './ChallengeLogScreen';

const testSafeAreaMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

jest.mock('@/lib/api', () => ({
  apiClient: {
    listTodayChallenges: jest.fn(),
    startChallenge: jest.fn(),
    completeChallenge: jest.fn(),
    saveChallengeDraft: jest.fn(),
  },
}));

jest.mock('expo-router', () => ({
  Redirect: () => null,
  router: { replace: jest.fn(), push: jest.fn(), canDismiss: () => true, dismiss: jest.fn() },
}));

const mockedApi = apiClient as unknown as Record<
  'listTodayChallenges' | 'startChallenge' | 'completeChallenge' | 'saveChallengeDraft',
  jest.Mock
>;

function reading(overrides: Partial<TodayChallenge>): TodayChallenge {
  return {
    id: 'uc-log',
    challengeId: 'c-log',
    title: 'Check your blood pressure',
    description: '',
    category: 'hypertension',
    rewardPoints: 150,
    sortOrder: 0,
    status: 'in_progress',
    frequency: 'daily',
    completionKind: 'vitals_bp',
    instruction: '',
    icon: 'heart-pulse',
    periodKey: '2026-10-22',
    evidenceRequest: null,
    draft: null,
    progress: { filled: 0, required: 2 },
    capture: {
      kind: 'structured_log',
      metric: null,
      target: { durationMinutes: null, distanceMeters: null, count: null },
    },
    ...overrides,
  };
}

function renderSheet(occurrence: TodayChallenge) {
  mockedApi.listTodayChallenges.mockResolvedValue({
    dayKey: '2026-10-22',
    challenges: [occurrence],
    completedCount: 0,
    totalCount: 1,
  });
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  return render(
    <SafeAreaProvider initialMetrics={testSafeAreaMetrics}>
      <QueryClientProvider client={client}>
        <ChallengeLogScreen challengeId="c-log" />
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

function typeKeys(keys: readonly string[]) {
  keys.forEach((key) => fireEvent.press(screen.getByTestId(`keypad-${key}`)));
}

function saveButtonIsOff() {
  return screen.getByTestId('reading-save').props.accessibilityState?.disabled === true;
}

describe('ChallengeLogScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    takeChallengeFinish();
    mockedApi.saveChallengeDraft.mockResolvedValue({});
  });

  it('takes blood pressure as the pair, jumps to the bottom number, and turns the card over', async () => {
    const occurrence = reading({});
    mockedApi.completeChallenge.mockResolvedValue({
      challenge: { ...occurrence, status: 'completed' },
      pointsBalance: 150,
      currentStreakDays: 1,
      pointsAwarded: 150,
      evidenceRequest: null,
      penaltyApplied: 0,
    });
    renderSheet(occurrence);

    await screen.findByTestId('log-vitals-screen');
    typeKeys(['1', '2', '8']);
    expect(screen.getByTestId('vitals-diastolic').props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(saveButtonIsOff()).toBe(true);

    typeKeys(['8', '2']);
    fireEvent.press(screen.getByTestId('reading-save'));

    await waitFor(() => expect(router.dismiss).toHaveBeenCalled());
    expect(mockedApi.completeChallenge).toHaveBeenCalledWith({
      userChallengeId: 'uc-log',
      vitals: { systolic: 128, diastolic: 82 },
    });
    expect(takeChallengeFinish()).toMatchObject({ outcome: { kind: 'logged' } });
  });

  it('says the range a monitor can show and keeps save off until it fits', async () => {
    renderSheet(reading({}));

    await screen.findByTestId('log-vitals-screen');
    typeKeys(['2', '8', '8', '2']);

    expect(screen.getByText('The top number should be between 50 and 250.')).toBeOnTheScreen();
    expect(saveButtonIsOff()).toBe(true);
  });

  it('goes on to the photo check when this reading is picked for one', async () => {
    const occurrence = reading({});
    mockedApi.completeChallenge.mockResolvedValue({
      challenge: { ...occurrence, status: 'awaiting_evidence' },
      pointsBalance: 0,
      currentStreakDays: 0,
      pointsAwarded: 0,
      evidenceRequest: {
        expiresAt: '2026-10-22T08:11:00.000Z',
        windowSeconds: 60,
        penaltyPoints: 25,
      },
      penaltyApplied: 0,
    });
    renderSheet(occurrence);

    await screen.findByTestId('log-vitals-screen');
    typeKeys(['1', '2', '8', '8', '2']);
    fireEvent.press(screen.getByTestId('reading-save'));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/challenge/c-log/verify'));
    expect(takeChallengeFinish()).toBeNull();
  });

  it('keeps the numbers and offers to try again when the connection drops', async () => {
    mockedApi.completeChallenge.mockRejectedValue(new TypeError('Network request failed'));
    renderSheet(reading({}));

    await screen.findByTestId('log-vitals-screen');
    typeKeys(['1', '2', '8', '8', '2']);
    fireEvent.press(screen.getByTestId('reading-save'));

    expect(
      await screen.findByText(
        'That didn’t save. Your numbers are still here, so try again when you’re back online.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('reading-save')).toHaveTextContent('Try again');
    expect(screen.getByTestId('vitals-systolic')).toHaveTextContent('128');
  });

  it('will not save glucose until you say when it was taken', async () => {
    renderSheet(
      reading({ completionKind: 'glucose', category: 'diabetes', title: 'Check your glucose' }),
    );

    await screen.findByTestId('log-glucose');
    typeKeys(['5', '.', '4']);
    expect(saveButtonIsOff()).toBe(true);

    fireEvent.press(screen.getByText('Before a meal'));
    expect(saveButtonIsOff()).toBe(false);
  });
});
