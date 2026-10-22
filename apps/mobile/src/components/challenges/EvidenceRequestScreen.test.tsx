import type { TodayChallenge } from '@product/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import { apiClient } from '@/lib/api';
import { takeChallengeFinish } from '@/lib/challenge-finish-session';
import { EvidenceRequestScreen } from './EvidenceRequestScreen';

const testSafeAreaMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

jest.mock('@/lib/api', () => ({
  apiClient: {
    listTodayChallenges: jest.fn(),
    completeChallenge: jest.fn(),
    skipChallengeEvidence: jest.fn(),
  },
}));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn(), canDismiss: () => true, dismiss: jest.fn() },
}));

jest.mock('@/lib/is-physical-device', () => ({
  isPhysicalDevice: () => true,
}));

jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  const CameraView = React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
    React.useImperativeHandle(ref, () => ({
      takePictureAsync: async () => ({
        uri: 'file://monitor.jpg',
        base64: 'mmmm',
        width: 3,
        height: 4,
      }),
    }));
    return React.createElement(View, props);
  });
  CameraView.displayName = 'CameraView';
  return { CameraView, useCameraPermissions: () => [{ granted: true }, jest.fn()] };
});

const mockedApi = apiClient as unknown as Record<
  'listTodayChallenges' | 'completeChallenge' | 'skipChallengeEvidence',
  jest.Mock
>;

function bloodPressureCheck(expiresInMs: number): TodayChallenge {
  return {
    id: 'uc-bp',
    challengeId: 'c-bp',
    title: 'Check your blood pressure',
    description: 'Morning reading.',
    category: 'hypertension',
    rewardPoints: 150,
    sortOrder: 0,
    status: 'awaiting_evidence',
    frequency: 'daily',
    completionKind: 'vitals_bp',
    instruction: 'Sit for five minutes first.',
    icon: 'heart-pulse',
    periodKey: '2026-08-29',
    evidenceRequest: {
      expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
      windowSeconds: 60,
      penaltyPoints: 25,
    },
    draft: null,
    progress: { filled: 2, required: 3 },
    capture: {
      kind: 'structured_log',
      metric: null,
      target: { durationMinutes: null, distanceMeters: null, count: null },
    },
  };
}

function settled(challenge: TodayChallenge, pointsAwarded: number, penaltyApplied: number) {
  return {
    challenge: { ...challenge, status: 'completed', evidenceRequest: null },
    pointsBalance: 100,
    currentStreakDays: 1,
    pointsAwarded,
    evidenceRequest: null,
    penaltyApplied,
  };
}

function renderSheet(check: TodayChallenge) {
  mockedApi.listTodayChallenges.mockResolvedValue({
    dayKey: '2026-08-29',
    challenges: [check],
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
        <EvidenceRequestScreen challengeId="c-bp" />
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

describe('EvidenceRequestScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    takeChallengeFinish();
  });

  it('asks for the monitor with the camera live and the cost of skipping as one quiet line', async () => {
    renderSheet(bloodPressureCheck(60_000));

    expect(await screen.findByText('Show us the monitor.')).toBeOnTheScreen();
    expect(screen.getByText('Reading saved')).toBeOnTheScreen();
    expect(screen.getByText('Skip this one · −25 points')).toBeOnTheScreen();
  });

  it('sends the photo from the ring shutter and turns the card over', async () => {
    const check = bloodPressureCheck(60_000);
    mockedApi.completeChallenge.mockResolvedValue(settled(check, 150, 0));
    renderSheet(check);

    fireEvent.press(await screen.findByTestId('evidence-request-camera'));

    await waitFor(() => expect(router.dismiss).toHaveBeenCalled());
    expect(mockedApi.completeChallenge).toHaveBeenCalledWith({
      userChallengeId: 'uc-bp',
      evidence: { mimeType: 'image/jpeg', imageBase64: 'mmmm' },
    });
    expect(takeChallengeFinish()).toMatchObject({
      outcome: { kind: 'logged' },
      pointsAwarded: 150,
    });
  });

  it('says what was missing when the photo does not pass, and lets you take another', async () => {
    mockedApi.completeChallenge.mockRejectedValue(new Error('Monitor not visible'));
    renderSheet(bloodPressureCheck(60_000));

    fireEvent.press(await screen.findByTestId('evidence-request-camera'));

    expect(await screen.findByText('We couldn’t see the monitor.')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Take another'));
    expect(await screen.findByText('Show us the monitor.')).toBeOnTheScreen();
  });

  it('skips the photo and takes the penalty', async () => {
    const check = bloodPressureCheck(60_000);
    mockedApi.skipChallengeEvidence.mockResolvedValue(settled(check, 0, 25));
    renderSheet(check);

    fireEvent.press(await screen.findByTestId('evidence-request-skip'));

    await waitFor(() =>
      expect(mockedApi.skipChallengeEvidence).toHaveBeenCalledWith({ userChallengeId: 'uc-bp' }),
    );
    await waitFor(() => expect(router.dismiss).toHaveBeenCalled());
  });

  it('says calmly when time ran out, with what it cost', async () => {
    const check = bloodPressureCheck(0);
    mockedApi.skipChallengeEvidence.mockResolvedValue(settled(check, 0, 25));
    renderSheet(check);

    expect(await screen.findByText('Time ran out.')).toBeOnTheScreen();
    expect(screen.getByText('−25')).toBeOnTheScreen();
    await waitFor(() => expect(mockedApi.skipChallengeEvidence).toHaveBeenCalledTimes(1));
  });
});
