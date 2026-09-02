import { render, screen } from '@testing-library/react-native';
import { ChallengeShareCard, streakShareLabel } from './ChallengeShareCard';

describe('streakShareLabel', () => {
  it('names a new streak and longer runs', () => {
    expect(streakShareLabel(0)).toBe('Fresh start');
    expect(streakShareLabel(1)).toBe('Day 1 streak');
    expect(streakShareLabel(12)).toBe('Day 12 streak');
  });
});

describe('ChallengeShareCard', () => {
  it('renders a designed poster when there is no photo', () => {
    render(
      <ChallengeShareCard
        currentStreakDays={12}
        pointsAwarded={40}
        title="Walk 20 minutes"
      />,
    );

    expect(screen.getByTestId('challenge-share-card')).toBeOnTheScreen();
    expect(screen.getByText('Challenge complete')).toBeOnTheScreen();
    expect(screen.getByText('Walk 20 minutes')).toBeOnTheScreen();
    expect(screen.getByText('+40')).toBeOnTheScreen();
    expect(screen.getByText('Day 12 streak')).toBeOnTheScreen();
    expect(screen.getByText('Done on Healthy')).toBeOnTheScreen();
  });

  it('lays the gym selfie under the brand strip', () => {
    render(
      <ChallengeShareCard
        currentStreakDays={12}
        photoUri="file://gym.jpg"
        pointsAwarded={40}
        title="Gym session"
      />,
    );

    expect(screen.getByText('Gym session')).toBeOnTheScreen();
    expect(screen.getByText('+40 pts · Day 12 streak')).toBeOnTheScreen();
    expect(screen.queryByText('Done on Healthy')).toBeNull();
  });
});
