import { fontSize } from '@product/brand';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { GymPhotoShareCard } from './GymPhotoShareCard';
import { weekdayName } from './reading-time';
import { SHARE_POSTER_HEIGHT, SHARE_POSTER_RADIUS, SHARE_POSTER_WIDTH } from './SharePosterCard';

const gymPoster = {
  kind: 'gym' as const,
  label: 'Gym session',
  value: '08:00',
  unit: 'at the gym',
  when: '2026-10-23T08:00:00.000Z',
};

describe('GymPhotoShareCard', () => {
  it('fills the card with the photo and keeps the type in the bands', () => {
    render(
      <GymPhotoShareCard photoUri="file://gym.jpg" poster={gymPoster} runLine="4 days running" />,
    );

    const image = screen.getByTestId('gym-photo-share-image');
    expect(image).toHaveProp('source', { uri: 'file://gym.jpg' });
    expect(image).toHaveProp('resizeMode', 'cover');
    expect(screen.getByText('Gym session')).toBeOnTheScreen();
    expect(screen.getByText(weekdayName(new Date(gymPoster.when)))).toBeOnTheScreen();
    expect(screen.getByText('08:00')).toBeOnTheScreen();
    expect(StyleSheet.flatten(screen.getByText('08:00').props.style).fontSize).toBe(fontSize.xxl);
    expect(screen.getByTestId('share-brand-lockup')).toBeOnTheScreen();
    expect(screen.getByLabelText('Beatset')).toBeOnTheScreen();
    expect(screen.getByText('at the gym')).toBeOnTheScreen();
    expect(screen.getByText('4 days running')).toBeOnTheScreen();

    const shell = StyleSheet.flatten(screen.getByTestId('gym-photo-share-card').props.style);
    expect(shell.width).toBe(SHARE_POSTER_WIDTH);
    expect(shell.height).toBe(SHARE_POSTER_HEIGHT);
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
