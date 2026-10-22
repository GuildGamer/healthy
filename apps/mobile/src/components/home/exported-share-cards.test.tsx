import { darkColors, lightColors } from '@product/brand';
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

/** Importing these modules throws if the night stylesheet is built before it exists. */
describe('exported share cards', () => {
  beforeEach(() => {
    jest.mocked(useColorScheme).mockReturnValue('light');
  });

  it('stay on Healthy night when the phone is light', () => {
    render(
      <ThemeProvider>
        <DayShareCard content={day} />
        <GroupRecapCard board={liveBoard()} />
      </ThemeProvider>,
    );

    expect(fill('home-day-share-card')).toBe(darkColors.background);
    expect(fill('match-recap-card')).toBe(darkColors.background);
    expect(fill('home-day-share-card')).not.toBe(lightColors.background);
  });
});
