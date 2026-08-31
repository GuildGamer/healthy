import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { apiClient } from '@/lib/api';
import { setCaptureResult } from '@/lib/capture-session';
import { peekPendingShareCard } from '@/lib/share-card-session';
import { LogEvidenceScreen } from './LogEvidenceScreen';

jest.mock('@/lib/api', () => ({
  apiClient: {
    listTodayChallenges: jest.fn(),
    startChallenge: jest.fn(),
    completeChallenge: jest.fn(),
  },
}));

jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  const mockPush = jest.fn();
  return {
    useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
    useFocusEffect: (effect: () => void | (() => void)) => {
      useEffect(() => {
        const cleanup = effect();
        return typeof cleanup === 'function' ? cleanup : undefined;
      });
    },
  };
});

const mockedApi = apiClient as unknown as {
  listTodayChallenges: jest.Mock;
  startChallenge: jest.Mock;
  completeChallenge: jest.Mock;
};

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });

  function wrap(ui: ReactElement) {
    return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
  }

  return render(wrap(<LogEvidenceScreen challengeId="c-gym" />));
}

describe('LogEvidenceScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.listTodayChallenges.mockResolvedValue({
      dayKey: '2026-08-29',
      challenges: [
        {
          id: 'uc-gym',
          challengeId: 'c-gym',
          title: 'Complete a gym session',
          description: 'Train at the gym.',
          category: 'general',
          rewardPoints: 200,
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
            target: {
              durationMinutes: null,
              distanceMeters: null,
              count: null,
            },
          },
        },
      ],
      completedCount: 0,
      totalCount: 1,
    });
    mockedApi.completeChallenge.mockResolvedValue({
      pointsAwarded: 200,
      currentStreakDays: 1,
    });
  });

  it('opens the in-app camera for a selfie', async () => {
    renderScreen();

    fireEvent.press(await screen.findByTestId('evidence-take-photo'));

    expect(useRouter().push).toHaveBeenCalledWith({
      pathname: '/challenge/[challengeId]/camera',
      params: { challengeId: 'c-gym', intent: 'selfie' },
    });
  });

  it('submits a photo returned from the camera', async () => {
    setCaptureResult('c-gym', {
      mimeType: 'image/jpeg',
      imageBase64: 'a'.repeat(32),
      previewUri: 'file://gym.jpg',
    });

    renderScreen();

    expect(await screen.findByTestId('evidence-preview')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('evidence-submit'));

    await waitFor(() => {
      expect(mockedApi.completeChallenge).toHaveBeenCalledWith({
        userChallengeId: 'uc-gym',
        evidence: {
          mimeType: 'image/jpeg',
          imageBase64: 'a'.repeat(32),
        },
      });
    });

    expect(peekPendingShareCard()).toEqual({
      photoUri: 'file://gym.jpg',
      title: 'Complete a gym session',
      pointsAwarded: 200,
      currentStreakDays: 1,
    });
  });
});
