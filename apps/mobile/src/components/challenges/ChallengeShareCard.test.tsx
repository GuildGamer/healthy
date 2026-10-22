import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import {
  ChallengeShareCard,
  formatShareContext,
  formatShareDate,
  formatShareHeadline,
  formatShareReps,
  formatShareStamp,
  formatShareStreakValue,
  SHARE_CARD_URL,
  streakShareLabel,
} from './ChallengeShareCard';

const capturedAt = new Date('2026-09-04T13:22:00');

describe('streakShareLabel', () => {
  it('names a new streak and longer runs', () => {
    expect(streakShareLabel(0)).toBe('Fresh start');
    expect(streakShareLabel(1)).toBe('1 day streak');
    expect(streakShareLabel(12)).toBe('12 day streak');
  });
});

describe('formatShareStreakValue', () => {
  it('drops the word streak because the grid label carries it', () => {
    expect(formatShareStreakValue(0)).toBe('Fresh start');
    expect(formatShareStreakValue(1)).toBe('1 day');
    expect(formatShareStreakValue(12)).toBe('12 days');
  });
});

describe('formatShareHeadline', () => {
  it('turns the kicker into a sentence once', () => {
    expect(formatShareHeadline('Challenge complete')).toBe('Challenge complete.');
    expect(formatShareHeadline('Group set!')).toBe('Group set!');
  });
});

describe('formatShareStamp', () => {
  it('joins a short date and a 24-hour time', () => {
    const stamp = formatShareStamp(capturedAt);

    expect(stamp).toMatch(/4/);
    expect(stamp).toMatch(/Sep/);
    expect(stamp).toContain('·');
    expect(stamp).toMatch(/13:22/);
  });
});

describe('formatShareContext', () => {
  it('names the challenge unless the hero unit already says it', () => {
    const date = formatShareDate(capturedAt);

    expect(formatShareContext('Walk 20 minutes', 'points', capturedAt)).toBe(
      `Walk 20 minutes · ${date}`,
    );
    expect(formatShareContext('Do 20 push-ups', 'push-ups', capturedAt)).toBe(date);
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
  it('renders an editorial poster with a branded band when there is no photo', () => {
    render(
      <ChallengeShareCard
        capturedAt={capturedAt}
        currentStreakDays={12}
        pointsAwarded={40}
        title="Walk 20 minutes"
      />,
    );

    expect(screen.getByTestId('challenge-share-card')).toBeOnTheScreen();
    expect(screen.getByText('Challenge complete.')).toBeOnTheScreen();
    expect(screen.getByText(`Walk 20 minutes · ${formatShareDate(capturedAt)}`)).toBeOnTheScreen();
    expect(screen.getByText('+40')).toBeOnTheScreen();
    expect(screen.getByText('points')).toBeOnTheScreen();
    expect(screen.getByText('Streak')).toBeOnTheScreen();
    expect(screen.getByText('12 days')).toBeOnTheScreen();
    expect(screen.getByText('Healthy')).toBeOnTheScreen();
    expect(screen.getByText(SHARE_CARD_URL)).toBeOnTheScreen();
    expect(screen.queryByText('Goal')).toBeNull();
    expect(screen.queryByText('Counted by camera')).toBeNull();
  });

  it('makes the push-up count the hero with goal, streak, and the camera claim', () => {
    render(
      <ChallengeShareCard
        capturedAt={capturedAt}
        completedCount={25}
        currentStreakDays={12}
        pointsAwarded={150}
        targetCount={20}
        title="Do 20 push-ups"
        verified
      />,
    );

    expect(screen.getByText('25')).toBeOnTheScreen();
    expect(screen.getByText('push-ups')).toBeOnTheScreen();
    expect(screen.getByText(formatShareDate(capturedAt))).toBeOnTheScreen();
    expect(screen.getByText('Goal')).toBeOnTheScreen();
    expect(screen.getByText('20')).toBeOnTheScreen();
    expect(screen.getByText('12 days')).toBeOnTheScreen();
    expect(screen.getByText('Counted by camera')).toBeOnTheScreen();
    expect(screen.queryByText('Do 20 push-ups')).toBeNull();
    expect(screen.queryByText('+150')).toBeNull();
  });

  it('shows a match set without habit points', () => {
    render(
      <ChallengeShareCard
        capturedAt={capturedAt}
        completedCount={25}
        currentStreakDays={4}
        kicker="Match set"
        pointsAwarded={0}
        title="Best single set"
      />,
    );

    expect(screen.getByText('Match set.')).toBeOnTheScreen();
    expect(screen.getByText('25')).toBeOnTheScreen();
    expect(screen.getByText('push-ups')).toBeOnTheScreen();
    expect(screen.getByText(`Best single set · ${formatShareDate(capturedAt)}`)).toBeOnTheScreen();
    expect(screen.queryByText('+0')).toBeNull();
  });

  it('makes the push-up count the photo hero, with streak and stamp under it', () => {
    render(
      <ChallengeShareCard
        capturedAt={capturedAt}
        completedCount={25}
        currentStreakDays={12}
        kicker="Extra set"
        photoUri="file://set.jpg"
        pointsAwarded={0}
        title="Extra set"
        verified
      />,
    );

    expect(screen.getByText('Extra set')).toBeOnTheScreen();
    expect(screen.getByText('25')).toBeOnTheScreen();
    expect(screen.getByText('push-ups')).toBeOnTheScreen();
    expect(screen.getByText(`12 day streak · ${formatShareStamp(capturedAt)}`)).toBeOnTheScreen();
    expect(screen.getByText('Counted by camera')).toBeOnTheScreen();
    expect(screen.getByText(SHARE_CARD_URL)).toBeOnTheScreen();
  });

  it('treats the gym selfie as the post, with the band, streak, and stamp', () => {
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
    expect(screen.queryByText('Counted by camera')).toBeNull();
    expect(screen.queryByText('Gym session')).toBeNull();
  });

  it('keeps the capture square with mint behind the rounded field', () => {
    render(
      <ChallengeShareCard currentStreakDays={12} pointsAwarded={40} title="Walk 20 minutes" />,
    );

    const shotStyle = StyleSheet.flatten(screen.getByTestId('challenge-share-card').props.style);
    expect(shotStyle.borderRadius).toBeUndefined();
    expect(shotStyle.backgroundColor).toBe('#3DDC97');
  });

  it('scales the composition to the card width so exports match every phone', () => {
    render(
      <ChallengeShareCard
        completedCount={25}
        currentStreakDays={12}
        pointsAwarded={150}
        title="Do 20 push-ups"
      />,
    );

    const designFontSize = StyleSheet.flatten(screen.getByText('25').props.style)
      .fontSize as number;

    fireEvent(screen.getByTestId('challenge-share-card'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 720, height: 960 } },
    });

    const scaledFontSize = StyleSheet.flatten(screen.getByText('25').props.style)
      .fontSize as number;
    expect(scaledFontSize).toBe(designFontSize * 2);
  });
});
