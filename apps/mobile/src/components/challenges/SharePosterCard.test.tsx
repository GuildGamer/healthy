import { darkDeckCards, lightDeckCards } from '@product/brand';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SharePosterCard } from './SharePosterCard';

const walkPoster = {
  kind: 'walk' as const,
  label: 'Morning walk',
  value: '32',
  unit: 'minutes walked',
  when: '2026-10-23T08:00:00.000Z',
};

function fillBackground(): unknown {
  const root = screen.getByTestId('share-poster-image');
  const fillChild = root.children.find(
    (child: unknown): child is { props: { style?: unknown } } =>
      typeof child !== 'string' && child != null && typeof child === 'object',
  );
  return StyleSheet.flatten(fillChild?.props.style)?.backgroundColor;
}

describe('SharePosterCard', () => {
  it('draws a route silhouette when points are present', () => {
    render(
      <SharePosterCard
        poster={walkPoster}
        routePoints={[
          { latitude: 51.5, longitude: -0.13 },
          { latitude: 51.51, longitude: -0.12 },
          { latitude: 51.52, longitude: -0.11 },
        ]}
        runLine="3 day run"
      />,
    );

    expect(screen.getByTestId('share-poster-route')).toBeTruthy();
    expect(screen.getByText('32')).toBeTruthy();
    expect(screen.getByText('Healthy')).toBeTruthy();
  });

  it('stays metric-only when there is no route', () => {
    render(<SharePosterCard poster={walkPoster} runLine={null} />);

    expect(screen.queryByTestId('share-poster-route')).toBeNull();
    expect(screen.getByText('minutes walked')).toBeTruthy();
  });

  it('prefers the gym selfie over a route when both are passed', () => {
    render(
      <SharePosterCard
        photoUri="file://gym.jpg"
        poster={{
          kind: 'gym',
          label: 'Gym check-in',
          value: '08:00',
          unit: 'at the gym',
          when: '2026-10-23T08:00:00.000Z',
        }}
        routePoints={[
          { latitude: 51.5, longitude: -0.13 },
          { latitude: 51.51, longitude: -0.12 },
        ]}
        runLine={null}
      />,
    );

    expect(screen.getByTestId('share-poster-photo')).toBeTruthy();
    expect(screen.queryByTestId('share-poster-route')).toBeNull();
  });

  it('overrides the kind fill when fillId is set', () => {
    render(<SharePosterCard fillId="strength" poster={walkPoster} runLine={null} />);

    expect(fillBackground()).toBe(darkDeckCards.strength);
  });

  it('uses Clinic white with light ink when fillId is clinic', () => {
    render(<SharePosterCard fillId="clinic" poster={walkPoster} runLine={null} />);

    expect(fillBackground()).toBe('#FFFFFF');
    expect(StyleSheet.flatten(screen.getByText('32').props.style).color).toBe(
      lightDeckCards.text,
    );
  });
});
