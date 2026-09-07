import { render, screen } from '@testing-library/react-native';
import { PoseLandmarkOverlay } from './PoseLandmarkOverlay';

describe('PoseLandmarkOverlay', () => {
  it('renders dots and skeleton bones for visible landmarks', () => {
    render(
      <PoseLandmarkOverlay
        frame={{
          timestampMs: 0,
          points: {
            nose: { x: 0.5, y: 0.2, score: 0.9 },
            leftShoulder: { x: 0.4, y: 0.35, score: 0.9 },
            rightShoulder: { x: 0.6, y: 0.35, score: 0.9 },
            leftElbow: { x: 0.35, y: 0.5, score: 0.8 },
            leftWrist: { x: 0.3, y: 0.65, score: 0.8 },
          },
        }}
        height={320}
        width={240}
      />,
    );

    expect(screen.getByTestId('pose-landmark-overlay')).toBeOnTheScreen();
    expect(screen.getAllByTestId('pose-skeleton-bone').length).toBeGreaterThan(
      0,
    );
  });

  it('renders nothing without a frame', () => {
    render(<PoseLandmarkOverlay frame={null} height={320} width={240} />);

    expect(screen.queryByTestId('pose-landmark-overlay')).toBeNull();
  });
});
