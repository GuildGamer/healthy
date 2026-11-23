import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { GymPhotoShareCard } from './GymPhotoShareCard';
import { SHARE_POSTER_RADIUS } from './SharePosterCard';

const gymPoster = {
  kind: 'gym' as const,
  label: 'Gym session',
  value: '08:00',
  unit: 'at the gym',
  when: '2026-10-23T08:00:00.000Z',
};

describe('GymPhotoShareCard', () => {
  it('keeps the caption in the footer under the photo', () => {
    render(<GymPhotoShareCard photoUri="file://gym.jpg" poster={gymPoster} />);

    expect(screen.getByTestId('gym-photo-share-image')).toHaveProp('source', {
      uri: 'file://gym.jpg',
    });
    expect(screen.getByText('Gym session')).toBeOnTheScreen();
    expect(screen.getByText('Beatset')).toBeOnTheScreen();
    expect(screen.getByText('at the gym')).toBeOnTheScreen();
  });

  it('uses square corners for the capture twin', () => {
    render(
      <GymPhotoShareCard corners="square" photoUri="file://gym.jpg" poster={gymPoster} />,
    );

    expect(StyleSheet.flatten(screen.getByTestId('gym-photo-share-card').props.style).borderRadius).toBe(
      0,
    );
  });

  it('keeps the soft radius on the preview', () => {
    render(<GymPhotoShareCard photoUri="file://gym.jpg" poster={gymPoster} />);

    expect(StyleSheet.flatten(screen.getByTestId('gym-photo-share-card').props.style).borderRadius).toBe(
      SHARE_POSTER_RADIUS,
    );
  });
});
