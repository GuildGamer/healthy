import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Sharing from 'expo-sharing';
import type { ComponentProps } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Metrics } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import {
  clearPendingShareCard,
  setPendingShareCard,
} from '@/lib/share-card-session';
import { ChallengeSuccessScreen } from './ChallengeSuccessScreen';

jest.mock('expo-router', () => {
  const push = jest.fn();
  const replace = jest.fn();
  return {
    useRouter: () => ({ push, replace }),
  };
});

const testSafeAreaMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderSuccess(
  props: Partial<ComponentProps<typeof ChallengeSuccessScreen>> = {},
) {
  return render(
    <SafeAreaProvider initialMetrics={testSafeAreaMetrics}>
      <ChallengeSuccessScreen
        currentStreakDays={12}
        pointsAwarded={40}
        title="Gym session"
        {...props}
      />
    </SafeAreaProvider>,
  );
}

afterEach(() => {
  clearPendingShareCard();
  jest.clearAllMocks();
});

describe('ChallengeSuccessScreen share card', () => {
  it('shows the branded preview when a gym selfie was just submitted', () => {
    setPendingShareCard({
      photoUri: 'file://gym.jpg',
      title: 'Gym session',
      pointsAwarded: 40,
      currentStreakDays: 12,
    });

    renderSuccess();

    expect(screen.getByTestId('challenge-share-card')).toBeOnTheScreen();
    expect(screen.getByText('Healthy')).toBeOnTheScreen();
    expect(screen.getByText('+40 pts · Day 12 streak')).toBeOnTheScreen();
    expect(screen.getByTestId('challenge-success-share')).toBeOnTheScreen();
  });

  it('stays on the classic celebration when there is no photo to share', () => {
    renderSuccess();

    expect(screen.queryByTestId('challenge-share-card')).toBeNull();
    expect(screen.queryByTestId('challenge-success-share')).toBeNull();
    expect(screen.getByText('Nice work. The points are yours.')).toBeOnTheScreen();
  });

  it('shares a captured card image', async () => {
    setPendingShareCard({
      photoUri: 'file://gym.jpg',
      title: 'Gym session',
      pointsAwarded: 40,
      currentStreakDays: 12,
    });

    renderSuccess();
    fireEvent.press(screen.getByTestId('challenge-success-share'));

    await waitFor(() => {
      expect(captureRef).toHaveBeenCalled();
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        'file://share-card.jpg',
        expect.objectContaining({ mimeType: 'image/jpeg' }),
      );
    });
  });
});
