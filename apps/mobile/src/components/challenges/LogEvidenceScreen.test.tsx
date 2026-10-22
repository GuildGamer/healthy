import type { TodayChallenge } from '@product/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import { apiClient } from '@/lib/api';
import { takeChallengeFinish } from '@/lib/challenge-finish-session';
import { LogEvidenceScreen } from './LogEvidenceScreen';

const testSafeAreaMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

jest.mock('@/lib/api', () => ({
  apiClient: {
    listTodayChallenges: jest.fn(),
    startChallenge: jest.fn(),
    completeChallenge: jest.fn(),
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
        uri: 'file://gym.jpg',
        base64: 'gggg',
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
  'listTodayChallenges' | 'startChallenge' | 'completeChallenge',
  jest.Mock
>;

const gym: TodayChallenge = {
  id: 'uc-gym',
  challengeId: 'c-gym',
  title: 'Complete a gym session',
  description: 'Train at the gym.',
  category: 'general',
  rewardPoints: 200,
  sortOrder: 0,
  status: 'in_progress',
  frequency: 'daily',
  completionKind: 'evidence_photo',
  instruction: 'Take a gym photo.',
  icon: 'dumbbell',
  periodKey: '2026-08-29',
  evidenceRequest: null,
  draft: null,
  progress: { filled: 0, required: 1 },
  capture: {
    kind: 'photo',
    metric: null,
    target: { durationMinutes: null, distanceMeters: null, count: null },
  },
};

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  return render(
    <SafeAreaProvider initialMetrics={testSafeAreaMetrics}>
      <QueryClientProvider client={client}>
        <LogEvidenceScreen challengeId="c-gym" />
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

async function takeAndUsePhoto() {
  fireEvent.press(await screen.findByTestId('camera-shutter'));
  fireEvent.press(await screen.findByTestId('camera-use-photo'));
}

describe('LogEvidenceScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    takeChallengeFinish();
    mockedApi.listTodayChallenges.mockResolvedValue({
      dayKey: '2026-08-29',
      challenges: [gym],
      completedCount: 0,
      totalCount: 1,
    });
  });

  it('opens the front camera, sends the photo, and turns the card over', async () => {
    mockedApi.completeChallenge.mockResolvedValue({
      challenge: { ...gym, status: 'completed' },
      pointsBalance: 200,
      currentStreakDays: 1,
      pointsAwarded: 200,
      evidenceRequest: null,
      penaltyApplied: 0,
    });
    renderScreen();

    expect(await screen.findByText('Gym check-in')).toBeOnTheScreen();
    await takeAndUsePhoto();

    await waitFor(() => expect(router.dismiss).toHaveBeenCalled());
    expect(mockedApi.completeChallenge).toHaveBeenCalledWith({
      userChallengeId: 'uc-gym',
      evidence: { mimeType: 'image/jpeg', imageBase64: 'gggg' },
    });
    expect(takeChallengeFinish()).toMatchObject({ outcome: { kind: 'photo' }, pointsAwarded: 200 });
  });

  it('says plainly when the photo did not pass, and lets you retake it', async () => {
    mockedApi.completeChallenge.mockRejectedValue(new Error('No gym equipment visible'));
    renderScreen();

    await takeAndUsePhoto();

    expect(
      await screen.findByText(
        'We couldn’t see you at the gym in that one. Retake it with the gym behind you.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('camera-retake')).toBeOnTheScreen();
    expect(router.dismiss).not.toHaveBeenCalled();
  });
});
