import type { TodayChallenge } from '@product/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import { apiClient } from '@/lib/api';
import { takeChallengeFinish } from '@/lib/challenge-finish-session';
import { readLastNightSleep, type SleepSample } from '@/lib/device-health';
import { SleepSheet } from './SleepSheet';
import { sleepWindow } from './sleep-window';
import { DEFAULT_BED_MINUTE, DEFAULT_WAKE_MINUTE } from './constants/sleep-defaults';

const testSafeAreaMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

jest.mock('@/lib/api', () => ({
  apiClient: {
    completeChallenge: jest.fn(),
    me: jest.fn(),
    updateHealthLink: jest.fn(),
  },
}));

jest.mock('@/lib/device-health', () => {
  const actual = jest.requireActual<typeof import('@/lib/device-health')>('@/lib/device-health');
  return {
    ...actual,
    readLastNightSleep: jest.fn(),
    requestSleepHealthAccess: jest.fn(async () => 'connected'),
    requestMovementAccess: jest.fn(async () => 'connected'),
  };
});

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn(), canDismiss: () => true, dismiss: jest.fn() },
}));

const mockedComplete = apiClient.completeChallenge as jest.Mock;
const mockedMe = apiClient.me as jest.Mock;
const mockedUpdateHealthLink = apiClient.updateHealthLink as jest.Mock;
const mockedReadLastNightSleep = readLastNightSleep as jest.MockedFunction<
  typeof readLastNightSleep
>;

const sleepOccurrence = {
  id: 'uc-sleep',
  challengeId: 'c-sleep',
  title: 'Log last night’s sleep',
  description: '',
  category: 'general',
  rewardPoints: 100,
  sortOrder: 0,
  status: 'in_progress',
  frequency: 'daily',
  completionKind: 'check_in',
  instruction: '',
  icon: 'sleep',
  periodKey: '2026-10-23',
  evidenceRequest: null,
  draft: null,
  progress: { filled: 0, required: 1 },
  capture: {
    kind: 'structured_log',
    metric: 'sleep',
    target: { durationMinutes: null, distanceMeters: null, count: null },
  },
} as TodayChallenge;

const healthSample: SleepSample = {
  wentToBedAt: '2026-10-22T22:00:00.000Z',
  wokeUpAt: '2026-10-23T06:00:00.000Z',
  source: 'healthkit',
  durationMinutes: 8 * 60,
  inBedOnly: false,
};

function renderSheet() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  return render(
    <SafeAreaProvider initialMetrics={testSafeAreaMetrics}>
      <QueryClientProvider client={client}>
        <SleepSheet occurrence={sleepOccurrence} />
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

describe('SleepSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    takeChallengeFinish();
    mockedMe.mockResolvedValue({ healthLinkStatus: 'connected' });
    mockedReadLastNightSleep.mockResolvedValue(null);
    mockedComplete.mockResolvedValue({
      challenge: { ...sleepOccurrence, status: 'completed' },
      pointsBalance: 100,
      currentStreakDays: 1,
      pointsAwarded: 100,
      evidenceRequest: null,
      penaltyApplied: 0,
    });
  });

  it('uses default times when there is no health sample', async () => {
    renderSheet();

    await waitFor(() => expect(screen.getByTestId('log-sleep-duration')).toHaveTextContent('8h'));
    expect(screen.getByTestId('sleep-bed-time')).toBeTruthy();
    expect(screen.queryByTestId('sleep-health-source')).toBeNull();

    fireEvent.press(screen.getByTestId('sleep-rested-4'));
    fireEvent.press(screen.getByTestId('reading-save'));

    await waitFor(() => expect(mockedComplete).toHaveBeenCalled());
    const expected = sleepWindow(DEFAULT_BED_MINUTE, DEFAULT_WAKE_MINUTE);
    expect(mockedComplete).toHaveBeenCalledWith({
      userChallengeId: 'uc-sleep',
      sleep: {
        wentToBedAt: expected.wentToBedAt,
        wokeUpAt: expected.wokeUpAt,
        rested: 4,
      },
    });
  });

  it('confirms a health sample and saves that window', async () => {
    mockedReadLastNightSleep.mockResolvedValue(healthSample);
    renderSheet();

    await waitFor(() => expect(screen.getByTestId('sleep-health-source')).toHaveTextContent(
      'From Apple Health',
    ));
    expect(screen.getByTestId('log-sleep-duration')).toHaveTextContent('8h');

    fireEvent.press(screen.getByTestId('reading-save'));

    await waitFor(() => expect(mockedComplete).toHaveBeenCalled());
    expect(mockedComplete).toHaveBeenCalledWith({
      userChallengeId: 'uc-sleep',
      sleep: {
        wentToBedAt: healthSample.wentToBedAt,
        wokeUpAt: healthSample.wokeUpAt,
      },
    });
  });

  it('switches to the time pickers when Edit times is pressed', async () => {
    mockedReadLastNightSleep.mockResolvedValue(healthSample);
    renderSheet();

    await waitFor(() => expect(screen.getByTestId('sleep-edit-times')).toBeTruthy());
    fireEvent.press(screen.getByTestId('sleep-edit-times'));

    expect(screen.getByTestId('sleep-bed-time')).toBeTruthy();
    expect(screen.getByTestId('sleep-wake-time')).toBeTruthy();
    expect(screen.queryByTestId('sleep-health-source')).toBeNull();
  });

  it('prompts to connect when health link status is unknown, and Not now opens times', async () => {
    mockedMe.mockResolvedValue({ healthLinkStatus: 'unknown' });
    mockedUpdateHealthLink.mockResolvedValue({ healthLinkStatus: 'denied' });
    renderSheet();

    await waitFor(() => expect(screen.getByTestId('skip-health')).toBeTruthy());
    fireEvent.press(screen.getByTestId('skip-health'));

    await waitFor(() => expect(mockedUpdateHealthLink).toHaveBeenCalledWith({ status: 'denied' }));
    await waitFor(() => expect(screen.getByTestId('sleep-bed-time')).toBeTruthy());
  });
});
