import { fontSize } from '@product/brand';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import {
  GYM_PHOTO_SHARE_HEIGHT,
  GYM_PHOTO_SHARE_WIDTH,
  GYM_PHOTO_TYPE_PADDING,
  GymPhotoShareCard,
} from './GymPhotoShareCard';
import { weekdayName } from './reading-time';
import { SHARE_POSTER_RADIUS } from './SharePosterCard';

const gymPoster = {
  kind: 'gym' as const,
  label: 'Gym session',
  value: '08:00',
  unit: 'at the gym',
  when: '2026-10-23T08:00:00.000Z',
};

function revealPreviewPhoto() {
  fireEvent(screen.getByTestId('gym-photo-share-image'), 'load');
}

describe('GymPhotoShareCard', () => {
  it('fills a 3:4 photo card and keeps the type in the bands', () => {
    render(
      <GymPhotoShareCard photoUri="file://gym.jpg" poster={gymPoster} runLine="4 days running" />,
    );
    revealPreviewPhoto();

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
    expect(shell.width).toBe(GYM_PHOTO_SHARE_WIDTH);
    expect(shell.height).toBe(GYM_PHOTO_SHARE_HEIGHT);
    expect(shell.width / shell.height).toBeCloseTo(3 / 4);
    expect(shell.overflow).toBeUndefined();
    expect(shell.backgroundColor).toBe('transparent');
  });

  it('insets type past the soft radius so corners do not clip labels', () => {
    render(<GymPhotoShareCard photoUri="file://gym.jpg" poster={gymPoster} />);
    revealPreviewPhoto();

    expect(GYM_PHOTO_TYPE_PADDING).toBeGreaterThan(SHARE_POSTER_RADIUS);
    const typeLayer = screen.getByTestId('gym-photo-share-card').children.find(
      (child: unknown): child is { props: { style?: unknown; pointerEvents?: string } } =>
        typeof child !== 'string' &&
        child != null &&
        typeof child === 'object' &&
        'props' in child &&
        (child as { props: { pointerEvents?: string } }).props.pointerEvents === 'none',
    );
    const typeStyle = StyleSheet.flatten(typeLayer?.props.style);
    expect(typeStyle?.paddingHorizontal).toBe(GYM_PHOTO_TYPE_PADDING);
    expect(typeStyle?.paddingTop).toBe(GYM_PHOTO_TYPE_PADDING);
  });

  it('sizes to the pager slot when width and height are passed', () => {
    render(
      <GymPhotoShareCard
        height={480}
        photoUri="file://gym.jpg"
        poster={gymPoster}
        width={360}
      />,
    );
    revealPreviewPhoto();

    const shell = StyleSheet.flatten(screen.getByTestId('gym-photo-share-card').props.style);
    expect(shell.width).toBe(360);
    expect(shell.height).toBe(480);
    expect(StyleSheet.flatten(screen.getByText('08:00').props.style).fontSize).toBe(
      fontSize.xxl * (360 / GYM_PHOTO_SHARE_WIDTH),
    );
  });

  it('fades the photo in so the shell never flashes black', () => {
    render(<GymPhotoShareCard photoUri="file://gym.jpg" poster={gymPoster} />);

    const image = screen.getByTestId('gym-photo-share-image');
    expect(StyleSheet.flatten(image.props.style).opacity).toBe(0);
    expect(screen.queryByText('Gym session')).toBeNull();
    fireEvent(image, 'load');
    expect(StyleSheet.flatten(screen.getByTestId('gym-photo-share-image').props.style).opacity).toBe(
      1,
    );
    expect(screen.getByText('Gym session')).toBeOnTheScreen();
  });

  it('paints the capture twin immediately so exports are not blank', () => {
    render(
      <GymPhotoShareCard corners="square" photoUri="file://gym.jpg" poster={gymPoster} />,
    );

    expect(screen.getByText('Gym session')).toBeOnTheScreen();
    expect(screen.queryByTestId('gym-photo-share-image')).toBeNull();
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
