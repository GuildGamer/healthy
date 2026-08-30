import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { apiClient } from '@/lib/api';
import { EvidenceRequestScreen } from './EvidenceRequestScreen';

jest.mock('@/lib/api', () => ({
  apiClient: {
    listTodayChallenges: jest.fn(),
    completeChallenge: jest.fn(),
    skipChallengeEvidence: jest.fn(),
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
  skipChallengeEvidence: jest.Mock;
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

  return render(wrap(<EvidenceRequestScreen challengeId="c-walk" />));
}

describe('EvidenceRequestScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.listTodayChallenges.mockResolvedValue({
      dayKey: '2026-08-29',
      challenges: [
        {
          id: 'uc-walk',
          challengeId: 'c-walk',
          title: 'Take a ten-minute walk',
          description: 'Get outside.',
          category: 'general',
          rewardPoints: 150,
          status: 'awaiting_evidence',
          frequency: 'daily',
          completionKind: 'check_in',
          instruction: 'Get outside.',
          icon: 'walk',
          periodKey: '2026-08-29',
          evidenceRequest: {
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
            windowSeconds: 60,
            penaltyPoints: 25,
          },
          draft: null,
          progress: { filled: 2, required: 3 },
          capture: {
            kind: 'self_report',
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
    mockedApi.skipChallengeEvidence.mockResolvedValue({
      pointsAwarded: 0,
      penaltyApplied: 25,
      currentStreakDays: 0,
    });
  });

  it('opens the in-app camera for proof', async () => {
    renderScreen();

    fireEvent.press(await screen.findByTestId('evidence-request-camera'));

    expect(useRouter().push).toHaveBeenCalledWith({
      pathname: '/challenge/[challengeId]/camera',
      params: { challengeId: 'c-walk', intent: 'proof' },
    });
  });

  it('skips the photo and takes the penalty', async () => {
    renderScreen();

    fireEvent.press(await screen.findByTestId('evidence-request-skip'));

    await waitFor(() => {
      expect(mockedApi.skipChallengeEvidence).toHaveBeenCalledWith({
        userChallengeId: 'uc-walk',
      });
    });
  });
});
