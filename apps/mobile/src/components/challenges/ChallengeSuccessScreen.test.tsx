import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Sharing from 'expo-sharing';
import type { ComponentProps } from 'react';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Metrics } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { clearPendingSharePhoto, setPendingSharePhoto } from '@/lib/share-card-session';
import { ChallengeSuccessScreen } from './ChallengeSuccessScreen';

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    me: jest.fn(async () => ({
      hasMembership: true,
      name: 'Ada',
      countryCode: 'US',
      categories: ['general'],
    })),
    listTips: jest.fn(async () => ({ tips: [] })),
    listChallengeCatalog: jest.fn(async () => ({
      challenges: [],
      enrolledCount: 0,
      hasMembership: true,
      maxRemindersPerChallenge: 3,
    })),
    getExperimentAssignment: jest.fn(async () => null),
    createMatch: jest.fn(),
    setChallengeEnrollment: jest.fn(async () => ({
      challenges: [],
      enrolledCount: 0,
      hasMembership: true,
      maxRemindersPerChallenge: 3,
    })),
    trackAnalyticsEvent: jest.fn(async () => ({ ok: true })),
  },
  apiQuery: {},
}));

jest.mock('@/lib/auth-client', () => ({
  getSessionData: jest.fn(async () => ({
    user: { emailVerified: true, name: 'Ada' },
  })),
  isEmailVerified: () => true,
}));

jest.mock('expo-router', () => {
  const push = jest.fn();
  const replace = jest.fn();
  return {
    useRouter: () => ({ push, replace }),
  };
});

const mockGetLocalProofClip = jest.fn();

jest.mock('@/lib/proof-clip-store', () => ({
  getLocalProofClip: (clipId: string) => mockGetLocalProofClip(clipId),
}));

jest.mock('@/lib/proof-clip-upload', () => ({
  uploadProofClip: jest.fn(),
  discardLocalProofClip: jest.fn(async () => undefined),
}));

const testSafeAreaMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderSuccess(props: Partial<ComponentProps<typeof ChallengeSuccessScreen>> = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={client}>
      <SafeAreaProvider initialMetrics={testSafeAreaMetrics}>
        <ChallengeSuccessScreen
          currentStreakDays={12}
          pointsAwarded={40}
          title="Gym session"
          {...props}
        />
      </SafeAreaProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  clearPendingSharePhoto();
  jest.clearAllMocks();
});

describe('ChallengeSuccessScreen with a proof clip', () => {
  const clipFinish = {
    completedCount: 12,
    face: 'reps' as const,
    proofClipId: 'clip-1',
    title: 'Do 10 push-ups',
    userChallengeId: 'uc-1',
  };

  beforeEach(() => {
    mockGetLocalProofClip.mockResolvedValue({
      clipId: 'clip-1',
      fileUri: 'file:///clip.mp4',
      posterUri: 'file:///poster.jpg',
      displayCode: '42BW-A7J4',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('makes the clip the one job: one solid button and no share card behind it', async () => {
    renderSuccess(clipFinish);

    expect(await screen.findByTestId('proof-clip-hero')).toBeOnTheScreen();
    expect(screen.getByText('42BW-A7J4')).toBeOnTheScreen();
    expect(screen.getByTestId('proof-primary')).toHaveTextContent('Send');
    expect(screen.getByLabelText('Save to Photos')).toBeOnTheScreen();
    expect(screen.queryByTestId('share-poster-image')).toBeNull();
    expect(screen.queryByTestId('challenge-success-share')).toBeNull();
  });

  it('falls back to the share card once the clip is discarded, without calling it lost', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.[1]?.onPress?.();
    });
    renderSuccess(clipFinish);

    fireEvent.press(await screen.findByTestId('proof-discard'));

    expect(await screen.findByTestId('share-poster-image')).toBeOnTheScreen();
    expect(screen.queryByText('Your proof clip didn’t save.')).toBeNull();
  });

  it('says so when recording was on but the clip never landed', () => {
    renderSuccess({ ...clipFinish, proofClipId: undefined, proofFailed: true });

    expect(screen.getByText('Your proof clip didn’t save.')).toBeOnTheScreen();
    expect(screen.getByTestId('share-poster-image')).toBeOnTheScreen();
  });
});

describe('ChallengeSuccessScreen share card', () => {
  it('shows the share card after a check-in, without the points', () => {
    renderSuccess({ title: 'Take your preventer inhaler', face: 'done' });

    expect(screen.getByTestId('share-poster-image')).toBeOnTheScreen();
    expect(screen.getByText('Take your preventer inhaler')).toBeOnTheScreen();
    expect(screen.getByText('Done')).toBeOnTheScreen();
    expect(screen.getByText('Healthy')).toBeOnTheScreen();
    expect(screen.getByText('12 days running')).toBeOnTheScreen();
    expect(screen.queryByText('+40')).toBeNull();
    expect(screen.queryByText('points')).toBeNull();
    expect(screen.getByTestId('challenge-success-share')).toBeOnTheScreen();
  });

  it('puts the gym selfie behind the card, branded in the footer, without a points poster', async () => {
    setPendingSharePhoto({ userChallengeId: 'uc-gym', photoUri: 'file://gym.jpg' });

    renderSuccess({ face: 'gym', title: 'Gym session', userChallengeId: 'uc-gym' });

    expect(screen.getByTestId('share-poster-image')).toBeOnTheScreen();
    expect(screen.getByTestId('share-poster-photo')).toHaveProp('source', {
      uri: 'file://gym.jpg',
    });
    expect(screen.getByText('Gym session')).toBeOnTheScreen();
    expect(screen.getByText('at the gym')).toBeOnTheScreen();
    expect(screen.getByText('Healthy')).toBeOnTheScreen();
    expect(screen.getByText('12 days running')).toBeOnTheScreen();
    expect(screen.queryByText('+40')).toBeNull();
    expect(await screen.findByTestId('challenge-success-share')).toBeOnTheScreen();
  });

  it('keeps the plain card when the selfie belongs to a different finish', () => {
    setPendingSharePhoto({ userChallengeId: 'uc-yesterday', photoUri: 'file://gym.jpg' });

    renderSuccess({ face: 'gym', title: 'Gym session', userChallengeId: 'uc-gym' });

    expect(screen.getByTestId('share-poster-image')).toBeOnTheScreen();
    expect(screen.queryByTestId('share-poster-photo')).toBeNull();
    expect(screen.getByText('at the gym')).toBeOnTheScreen();
  });

  it('puts the push-up count on the share card', () => {
    renderSuccess({
      completedCount: 25,
      targetCount: 20,
      title: 'Do 20 push-ups',
      pointsAwarded: 150,
      face: 'reps',
    });

    expect(screen.getByText('25')).toBeOnTheScreen();
    expect(screen.getByText('push-ups')).toBeOnTheScreen();
    expect(screen.getByText('Do 20 push-ups')).toBeOnTheScreen();
    expect(screen.queryByText('Goal')).toBeNull();
    expect(screen.queryByText('Counted by camera')).toBeNull();
    expect(screen.queryByText('+150')).toBeNull();
  });

  it('does not claim camera counting for a non-rep habit', () => {
    renderSuccess({ title: 'Walk 20 minutes', face: 'done' });

    expect(screen.queryByText('Counted by camera')).toBeNull();
    expect(screen.queryByText('+40')).toBeNull();
  });

  it('keeps a quiet way out while the experiment assignment loads', () => {
    const { apiClient } = jest.requireMock('@/lib/api') as {
      apiClient: { getExperimentAssignment: jest.Mock };
    };
    apiClient.getExperimentAssignment.mockReturnValueOnce(new Promise(() => undefined));

    renderSuccess({ completedCount: 20, title: 'Do 20 push-ups' });

    expect(screen.getByTestId('challenge-success-assigning')).toBeOnTheScreen();
    expect(screen.getByText('Not now')).toBeOnTheScreen();
    expect(screen.queryByTestId('challenge-success-membership')).toBeNull();
  });

  it('shares a match set and returns to the board', async () => {
    renderSuccess({
      completedCount: 25,
      matchId: 'm1',
      matchMetric: 'pushups',
      pointsAwarded: 0,
      title: 'Best single set',
    });

    expect(screen.getByText('25')).toBeOnTheScreen();
    expect(screen.getByText('Best single set')).toBeOnTheScreen();
    expect(screen.getByText('push-ups')).toBeOnTheScreen();
    expect(screen.queryByText('Group set.')).toBeNull();
    await waitFor(() => {
      expect(screen.getByTestId('challenge-success-challenge-friend')).toBeOnTheScreen();
    });
    expect(screen.getByText('Not now')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('challenge-success-done'));
    const { useRouter } = jest.requireMock('expo-router') as {
      useRouter: () => { replace: jest.Mock };
    };
    await waitFor(() => {
      expect(useRouter().replace).toHaveBeenCalledWith('/matches/m1');
    });
  });

  it('shows challenge-a-friend as the primary treatment CTA', async () => {
    const { apiClient } = jest.requireMock('@/lib/api') as {
      apiClient: {
        getExperimentAssignment: jest.Mock;
      };
    };
    apiClient.getExperimentAssignment.mockResolvedValueOnce({
      experimentId: 'exp1',
      experimentKey: 'challenge_referral_v1',
      variantId: 'v1',
      variantKey: 'treatment',
      configuration: { completionCta: 'challenge_friend_primary' },
      assignedAt: new Date().toISOString(),
    });

    renderSuccess({
      completedCount: 20,
      userChallengeId: 'uc-1',
      title: 'Do 20 push-ups',
      pointsAwarded: 150,
    });

    await waitFor(() => {
      expect(screen.getByTestId('challenge-success-challenge-friend')).toBeOnTheScreen();
    });
    expect(screen.getByText('Think a friend can beat you?')).toBeOnTheScreen();
    expect(screen.getByLabelText('Challenge a friend')).toBeOnTheScreen();
    expect(screen.getByTestId('challenge-success-share')).toHaveProp(
      'accessibilityLabel',
      'Share result',
    );
    expect(screen.queryByLabelText('Share')).toBeNull();
    expect(screen.getByText('Not now')).toBeOnTheScreen();
  });

  it('offers challenge-a-friend whenever a counted set is eligible', async () => {
    renderSuccess({ completedCount: 20, title: 'Do 20 push-ups' });

    await waitFor(() => {
      expect(screen.getByTestId('challenge-success-challenge-friend')).toBeOnTheScreen();
    });
    expect(screen.getByTestId('challenge-success-share')).toHaveProp(
      'accessibilityLabel',
      'Share result',
    );
    expect(screen.getByText('Not now')).toBeOnTheScreen();
  });

  it('pairs the membership link with dismiss for non-members', async () => {
    const { apiClient } = jest.requireMock('@/lib/api') as {
      apiClient: { me: jest.Mock };
    };
    apiClient.me.mockResolvedValueOnce({
      hasMembership: false,
      name: 'Ada',
      countryCode: 'US',
      categories: ['general'],
    });

    renderSuccess();

    await waitFor(() => {
      expect(screen.getByTestId('challenge-success-membership')).toBeOnTheScreen();
    });
    expect(screen.getByTestId('challenge-success-done')).toBeOnTheScreen();
  });

  it('offers challenge-a-friend after a practice set too', async () => {
    const { apiClient } = jest.requireMock('@/lib/api') as {
      apiClient: {
        getExperimentAssignment: jest.Mock;
      };
    };
    apiClient.getExperimentAssignment.mockResolvedValueOnce({
      experimentId: 'exp1',
      experimentKey: 'challenge_referral_v1',
      variantId: 'v1',
      variantKey: 'treatment',
      configuration: { completionCta: 'challenge_friend_primary' },
      assignedAt: new Date().toISOString(),
    });

    renderSuccess({
      completedCount: 30,
      practice: true,
      pointsAwarded: 0,
      title: 'Extra set',
    });

    await waitFor(() => {
      expect(screen.getByTestId('challenge-success-challenge-friend')).toBeOnTheScreen();
    });
  });

  it('hides share after a missed photo check', () => {
    renderSuccess({ penaltyApplied: 25, pointsAwarded: 0 });

    expect(screen.queryByTestId('share-poster-image')).toBeNull();
    expect(screen.queryByTestId('challenge-success-share')).toBeNull();
    expect(screen.getByText('Photo check missed')).toBeOnTheScreen();
    expect(screen.getByTestId('challenge-success-done')).toBeOnTheScreen();
  });

  it('shares a captured card image', async () => {
    renderSuccess();

    await waitFor(() => {
      expect(screen.getByTestId('challenge-success-share')).toBeOnTheScreen();
    });

    fireEvent.press(screen.getByTestId('challenge-success-share'));

    await waitFor(() => {
      expect(captureRef).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          format: 'png',
          quality: 1,
        }),
      );
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        'file://share-card.jpg',
        expect.objectContaining({ mimeType: 'image/png' }),
      );
    });
  });
});

describe('ChallengeSuccessScreen goal ladder', () => {
  it('offers the next push-up goal at streak 3 with goal 5', async () => {
    renderSuccess({
      activityKey: 'pushups',
      challengeId: 'c-push',
      currentStreakDays: 3,
      targetCount: 5,
      completedCount: 5,
      title: 'Do 5 push-ups',
      userChallengeId: 'uc-push',
    });

    await waitFor(() => {
      expect(screen.getByTestId('goal-ladder-offer')).toBeOnTheScreen();
    });
    expect(screen.getByText('Ready for 8 push-ups?')).toBeOnTheScreen();
  });

  it('hides the ladder for practice, matches, custom goals, and off-gate streaks', () => {
    const { unmount: unmountPractice } = renderSuccess({
      activityKey: 'pushups',
      challengeId: 'c-push',
      currentStreakDays: 3,
      targetCount: 5,
      practice: true,
    });
    expect(screen.queryByTestId('goal-ladder-offer')).toBeNull();
    unmountPractice();

    const { unmount: unmountMatch } = renderSuccess({
      activityKey: 'pushups',
      challengeId: 'c-push',
      currentStreakDays: 3,
      targetCount: 5,
      matchId: 'm1',
    });
    expect(screen.queryByTestId('goal-ladder-offer')).toBeNull();
    unmountMatch();

    const { unmount: unmountCustom } = renderSuccess({
      activityKey: 'pushups',
      challengeId: 'c-push',
      currentStreakDays: 3,
      targetCount: 20,
    });
    expect(screen.queryByTestId('goal-ladder-offer')).toBeNull();
    unmountCustom();

    renderSuccess({
      activityKey: 'pushups',
      challengeId: 'c-push',
      currentStreakDays: 4,
      targetCount: 5,
    });
    expect(screen.queryByTestId('goal-ladder-offer')).toBeNull();
  });

  it('accepts the ladder bump via enrollment', async () => {
    const { apiClient } = jest.requireMock('@/lib/api') as {
      apiClient: { setChallengeEnrollment: jest.Mock };
    };

    renderSuccess({
      activityKey: 'pushups',
      challengeId: 'c-push',
      currentStreakDays: 3,
      targetCount: 5,
      completedCount: 5,
      title: 'Do 5 push-ups',
      userChallengeId: 'uc-push',
    });

    await waitFor(() => {
      expect(screen.getByTestId('goal-ladder-accept')).toBeOnTheScreen();
    });

    fireEvent.press(screen.getByTestId('goal-ladder-accept'));

    await waitFor(() => {
      expect(apiClient.setChallengeEnrollment).toHaveBeenCalledWith({
        challengeId: 'c-push',
        isEnrolled: true,
        targetCount: 8,
      });
    });

    await waitFor(() => {
      expect(screen.queryByTestId('goal-ladder-offer')).toBeNull();
    });
  });
});
