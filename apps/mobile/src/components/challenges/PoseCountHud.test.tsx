import { render, screen } from '@testing-library/react-native';
import { playGoalReachedHaptic } from '@/lib/haptics';
import { PoseCountHud } from './PoseCountHud';

jest.mock('@/lib/haptics', () => ({
  playGoalReachedHaptic: jest.fn(async () => undefined),
}));

const mockedHaptic = playGoalReachedHaptic as jest.MockedFunction<typeof playGoalReachedHaptic>;

describe('PoseCountHud', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('shows the live count against the target while short of it', () => {
    render(<PoseCountHud count={4} meta="Tracking" target={10} />);

    expect(screen.getByTestId('pose-count')).toHaveTextContent('4');
    expect(screen.getByTestId('pose-target')).toHaveTextContent('of 10');
    expect(screen.queryByTestId('pose-target-badge')).toBeNull();
    expect(mockedHaptic).not.toHaveBeenCalled();
  });

  it('marks the target as hit on the rep that reaches it', () => {
    render(<PoseCountHud count={10} meta="Tracking" target={10} />);

    expect(screen.getByTestId('pose-target-badge')).toBeOnTheScreen();
    expect(screen.getByText('Target hit')).toBeOnTheScreen();
  });

  it('buzzes once on the rep that reaches the target', () => {
    const view = render(<PoseCountHud count={10} meta="Tracking" target={10} />);

    expect(mockedHaptic).toHaveBeenCalledTimes(1);

    // Extra reps ride on the badge, so they must not re-buzz.
    view.update(<PoseCountHud count={11} meta="Tracking" target={10} />);
    view.update(<PoseCountHud count={12} meta="Tracking" target={10} />);

    expect(mockedHaptic).toHaveBeenCalledTimes(1);
  });

  it('keeps the target credited while extra reps stack up', () => {
    render(<PoseCountHud count={14} meta="Tracking" target={10} />);

    expect(screen.getByTestId('pose-count')).toHaveTextContent('14');
    expect(screen.getByText('Target hit · +4')).toBeOnTheScreen();
  });

  it('drops the target readout for untargeted match sessions', () => {
    render(<PoseCountHud count={14} meta={null} target={0} />);

    expect(screen.getByTestId('pose-count')).toHaveTextContent('14');
    expect(screen.queryByTestId('pose-target-badge')).toBeNull();
    expect(screen.queryByTestId('pose-status')).toBeNull();
  });
});
