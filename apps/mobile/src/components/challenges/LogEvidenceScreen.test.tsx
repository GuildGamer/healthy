import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { apiClient } from '@/lib/api';
import { captureSelfie } from '@/lib/capture-selfie';
import { LogEvidenceScreen } from './LogEvidenceScreen';

jest.mock('@/lib/api', () => ({
  apiClient: {
    listTodayChallenges: jest.fn(),
    startChallenge: jest.fn(),
    completeChallenge: jest.fn(),
  },
}));

jest.mock('expo-router', () => {
  const replace = jest.fn();
  return {
    useRouter: () => ({ replace, back: jest.fn() }),
  };
});

jest.mock('@/lib/capture-selfie', () => ({
  captureSelfie: jest.fn(),
}));

const mockedApi = apiClient as unknown as {
  listTodayChallenges: jest.Mock;
  startChallenge: jest.Mock;
  completeChallenge: jest.Mock;
};

const mockedCapture = jest.mocked(captureSelfie);

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

  it('submits the captured photo', async () => {
    mockedCapture.mockResolvedValue({
      status: 'captured',
      photo: {
        mimeType: 'image/jpeg',
        imageBase64: 'a'.repeat(32),
        previewUri: 'file://gym.jpg',
      },
    });

    renderScreen();

    fireEvent.press(await screen.findByTestId('evidence-take-photo'));
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
  });
});
