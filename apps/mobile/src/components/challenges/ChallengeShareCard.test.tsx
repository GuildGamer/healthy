import { render, screen } from '@testing-library/react-native';
import {
  ChallengeShareCard,
  formatShareReps,
  formatShareStamp,
  streakShareLabel,
} from './ChallengeShareCard';

describe('streakShareLabel', () => {
  it('names a new streak and longer runs', () => {
    expect(streakShareLabel(0)).toBe('Fresh start');
    expect(streakShareLabel(1)).toBe('Day 1 streak');
    expect(streakShareLabel(12)).toBe('Day 12 streak');
  });
});

describe('formatShareStamp', () => {
  it('joins a short date and a 24-hour time', () => {
    const stamp = formatShareStamp(new Date('2026-09-04T13:22:00'));

    expect(stamp).toMatch(/4/);
    expect(stamp).toMatch(/Sep/);
    expect(stamp).toContain('·');
    expect(stamp).toMatch(/13:22/);
  });
});

describe('formatShareReps', () => {
  it('shows the set against the target', () => {
    expect(formatShareReps(25, 20)).toBe('25/20');
    expect(formatShareReps(20, 20)).toBe('20/20');
    expect(formatShareReps(25)).toBe('25');
    expect(formatShareReps(25, 0)).toBe('25');
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
    expect(screen.getByText(/Done on Healthy/)).toBeOnTheScreen();
  });

  it('puts the push-up set on the poster when they beat the target', () => {
    render(
      <ChallengeShareCard
        completedCount={25}
        currentStreakDays={12}
        pointsAwarded={150}
        targetCount={20}
        title="Do twenty push-ups"
      />,
    );

    expect(screen.getByText('25/20')).toBeOnTheScreen();
    expect(screen.getByText('push-ups')).toBeOnTheScreen();
    expect(screen.getByText('+150 points')).toBeOnTheScreen();
    expect(screen.queryByText('+150')).toBeNull();
  });

  it('shows a match set without habit points', () => {
    render(
      <ChallengeShareCard
        completedCount={25}
        currentStreakDays={4}
        kicker="Match set"
        pointsAwarded={0}
        title="Best single set"
      />,
    );

    expect(screen.getByText('Match set')).toBeOnTheScreen();
    expect(screen.getByText('25')).toBeOnTheScreen();
    expect(screen.getByText('push-ups')).toBeOnTheScreen();
    expect(screen.queryByText('+0 points')).toBeNull();
  });

  it('treats the gym selfie as the post, with mark, streak, and stamp', () => {
    const capturedAt = new Date('2026-09-04T13:22:00');

    render(
      <ChallengeShareCard
        capturedAt={capturedAt}
        currentStreakDays={12}
        photoUri="file://gym.jpg"
        pointsAwarded={40}
        title="Gym session"
      />,
    );

    expect(screen.getByText('Healthy')).toBeOnTheScreen();
    expect(screen.getByText('12')).toBeOnTheScreen();
    expect(screen.getByText('day streak')).toBeOnTheScreen();
    expect(screen.getByText(formatShareStamp(capturedAt))).toBeOnTheScreen();
    expect(screen.queryByText('Gym session')).toBeNull();
    expect(screen.queryByText('+40 pts · Day 12 streak')).toBeNull();
  });
});
