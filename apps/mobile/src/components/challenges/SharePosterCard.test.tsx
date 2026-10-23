import { render, screen } from '@testing-library/react-native';
import { SharePosterCard } from './SharePosterCard';

const walkPoster = {
  kind: 'walk' as const,
  label: 'Morning walk',
  value: '32',
  unit: 'minutes walked',
  when: '2026-10-23T08:00:00.000Z',
};

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
});
