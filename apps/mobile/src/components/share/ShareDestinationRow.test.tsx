import { fireEvent, render, screen } from '@testing-library/react-native';
import { ShareDestinationRow } from './ShareDestinationRow';

describe('ShareDestinationRow', () => {
  it('omits Send clip by default and includes core destinations', () => {
    render(<ShareDestinationRow onSelect={jest.fn()} />);

    expect(screen.getByTestId('share-dest-whatsapp')).toBeOnTheScreen();
    expect(screen.getByTestId('share-dest-x')).toBeOnTheScreen();
    expect(screen.getByTestId('share-dest-overflow')).toBeOnTheScreen();
    expect(screen.queryByTestId('share-dest-clip')).toBeNull();
    expect(screen.queryByTestId('share-dest-challenge')).toBeNull();
  });

  it('includes Send clip and Challenge when asked', () => {
    const onSelect = jest.fn();
    render(<ShareDestinationRow onSelect={onSelect} showChallenge showClip />);

    expect(screen.getByTestId('share-dest-clip')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('share-dest-challenge'));
    expect(onSelect).toHaveBeenCalledWith('challenge');
  });
});
