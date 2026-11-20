import { darkDeckCards } from '@product/brand';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Metrics } from 'react-native-safe-area-context';
import { DayShareScreen } from './DayShareScreen';

jest.mock('@/lib/analytics', () => ({
  shareWithTracking: jest.fn(async () => undefined),
  trackEvent: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  router: { canDismiss: () => true, dismiss: jest.fn(), replace: jest.fn() },
}));

const safeArea: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const content = {
  weekday: 'Thursday',
  dateLabel: '22 October',
  completedCount: 4,
  totalCount: 4,
  pointsToday: 500,
  streakDays: 7,
};

describe('DayShareScreen', () => {
  it('defaults to streak and applies a chosen fill', () => {
    render(
      <SafeAreaProvider initialMetrics={safeArea}>
        <DayShareScreen content={content} />
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId('day-share-screen')).toBeOnTheScreen();
    expect(screen.getByTestId('share-fill-streak').props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );

    fireEvent.press(screen.getByTestId('share-fill-water'));
    const root = screen.getByTestId('home-day-share-card');
    const fillChild = root.children.find(
      (child: unknown): child is { props: { style?: unknown } } =>
        typeof child !== 'string' && child != null && typeof child === 'object',
    );
    expect(StyleSheet.flatten(fillChild?.props.style)?.backgroundColor).toBe(darkDeckCards.water);
  });
});
