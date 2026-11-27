import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { GymPhotoShareCard } from './GymPhotoShareCard';
import {
  SHARE_POSTER_HEIGHT,
  SHARE_POSTER_PADDING,
  SHARE_POSTER_RADIUS,
  SHARE_POSTER_WIDTH,
} from './SharePosterCard';

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

function typeLayerStyle() {
  const typeLayer = screen.getByTestId('gym-photo-share-card').children.find(
    (child: unknown): child is { props: { style?: unknown; pointerEvents?: string } } =>
      typeof child !== 'string' &&
      child != null &&
      typeof child === 'object' &&
      'props' in child &&
      (child as { props: { pointerEvents?: string } }).props.pointerEvents === 'none',
  );
  return StyleSheet.flatten(typeLayer?.props.style);
}

describe('GymPhotoShareCard', () => {
  it('is the same 4:5 card as the colour poster', () => {
    render(<GymPhotoShareCard photoUri="file://gym.jpg" poster={gymPoster} />);

    const shell = StyleSheet.flatten(screen.getByTestId('gym-photo-share-card').props.style);
    expect(shell.width).toBe(SHARE_POSTER_WIDTH);
    expect(shell.height).toBe(SHARE_POSTER_HEIGHT);
    expect(shell.width / shell.height).toBeCloseTo(4 / 5);
    expect(shell.overflow).toBeUndefined();
    expect(shell.backgroundColor).toBe('transparent');
  });

  it('shows only the bottom block, leaving the face clear', () => {
    render(
      <GymPhotoShareCard photoUri="file://gym.jpg" poster={gymPoster} runLine="4 days running" />,
    );
    revealPreviewPhoto();

    const image = screen.getByTestId('gym-photo-share-image');
    expect(image).toHaveProp('source', { uri: 'file://gym.jpg' });
    expect(image).toHaveProp('resizeMode', 'cover');
    expect(screen.getByText('08:00')).toBeOnTheScreen();
    expect(screen.getByText('at the gym')).toBeOnTheScreen();
    expect(screen.getByTestId('share-brand-lockup')).toBeOnTheScreen();
    expect(screen.getByLabelText('Beatset')).toBeOnTheScreen();
    expect(screen.getByText('4 days running')).toBeOnTheScreen();
    expect(screen.queryByText('Gym session')).toBeNull();
  });

  it('uses the tightened type sizes at design width', () => {
    render(<GymPhotoShareCard photoUri="file://gym.jpg" poster={gymPoster} />);
    revealPreviewPhoto();

    expect(StyleSheet.flatten(screen.getByText('08:00').props.style).fontSize).toBe(26);
    expect(StyleSheet.flatten(screen.getByText('at the gym').props.style).fontSize).toBe(14);
  });

  it('keeps the card padding, which sits clear of the corner radius', () => {
    render(<GymPhotoShareCard photoUri="file://gym.jpg" poster={gymPoster} />);
    revealPreviewPhoto();

    expect(SHARE_POSTER_PADDING).toBeGreaterThan(SHARE_POSTER_RADIUS);
    expect(typeLayerStyle().padding).toBe(SHARE_POSTER_PADDING);
  });

  it('scales type and padding with the slot but never the corner radius', () => {
    render(
      <GymPhotoShareCard
        height={450}
        photoUri="file://gym.jpg"
        poster={gymPoster}
        width={360}
      />,
    );
    revealPreviewPhoto();

    const scale = 360 / SHARE_POSTER_WIDTH;
    const shell = StyleSheet.flatten(screen.getByTestId('gym-photo-share-card').props.style);
    expect(shell.width).toBe(360);
    expect(shell.height).toBe(450);
    expect(shell.borderRadius).toBe(SHARE_POSTER_RADIUS);
    expect(StyleSheet.flatten(screen.getByText('08:00').props.style).fontSize).toBe(26 * scale);
    expect(typeLayerStyle().padding).toBe(SHARE_POSTER_PADDING * scale);
  });

  it('shows a gym-coloured loader until the photo is ready', () => {
    render(<GymPhotoShareCard photoUri="file://gym.jpg" poster={gymPoster} />);

    expect(screen.getByTestId('gym-photo-share-loading')).toBeOnTheScreen();
    const image = screen.getByTestId('gym-photo-share-image');
    expect(StyleSheet.flatten(image.props.style).opacity).toBe(0);
    expect(screen.queryByText('08:00')).toBeNull();
    fireEvent(image, 'load');
    expect(screen.queryByTestId('gym-photo-share-loading')).toBeNull();
    expect(StyleSheet.flatten(screen.getByTestId('gym-photo-share-image').props.style).opacity).toBe(
      1,
    );
    expect(screen.getByText('08:00')).toBeOnTheScreen();
  });

  it('never shows the loader on the capture twin', () => {
    render(
      <GymPhotoShareCard corners="square" photoUri="file://gym.jpg" poster={gymPoster} />,
    );

    expect(screen.queryByTestId('gym-photo-share-loading')).toBeNull();
    expect(screen.getByText('08:00')).toBeOnTheScreen();
  });

  it('paints the capture twin immediately so exports are not blank', () => {
    render(
      <GymPhotoShareCard corners="square" photoUri="file://gym.jpg" poster={gymPoster} />,
    );

    expect(screen.getByText('08:00')).toBeOnTheScreen();
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
