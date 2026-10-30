import { darkDeckCards, lightDeckCards } from '@product/brand';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet, useColorScheme } from 'react-native';
import { DayShareCard } from '@/components/home/DayShareCard';
import { GroupRecapCard } from '@/components/matches/GroupRecapCard';
import { liveBoard } from '@/components/matches/testing/match-fixtures';
import { ThemeProvider } from '@/theme';
import type { DayShareContent } from './types/day-share';

const day: DayShareContent = {
  weekday: 'Thursday',
  dateLabel: '22 October',
  completedCount: 4,
  totalCount: 4,
  pointsToday: 500,
  streakDays: 7,
};

function fill(testID: string): unknown {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style).backgroundColor;
}

/** Day and group shares use the activity/streak deck fill, not a night slip. */
describe('exported share cards', () => {
  it('use the streak deck fill on Healthy night', () => {
    jest.mocked(useColorScheme).mockReturnValue('dark');
    render(
      <ThemeProvider>
        <DayShareCard content={day} />
      </ThemeProvider>,
    );

    expect(fill('home-day-share-card')).toBe(darkDeckCards.streak);
  });

  it('follow Clinic white on a light phone', () => {
    jest.mocked(useColorScheme).mockReturnValue('light');
    render(
      <ThemeProvider>
        <DayShareCard content={day} />
        <GroupRecapCard board={liveBoard()} />
      </ThemeProvider>,
    );

    expect(fill('home-day-share-card')).toBe(lightDeckCards.streak);
    expect(fill('match-recap-card')).toBe(lightDeckCards.walk);
  });
});
