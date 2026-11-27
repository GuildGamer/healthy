import { fireEvent, render, screen } from '@testing-library/react-native';
import { ShareDestinationRow } from './ShareDestinationRow';

describe('ShareDestinationRow', () => {
  it('renders the base destinations without Send clip', () => {
    render(<ShareDestinationRow onSelect={jest.fn()} />);

    expect(screen.getByTestId('share-dest-whatsapp')).toBeOnTheScreen();
    expect(screen.getByTestId('share-dest-overflow')).toBeOnTheScreen();
    expect(screen.queryByTestId('share-dest-clip')).toBeNull();
    expect(screen.queryByTestId('share-dest-challenge')).toBeNull();
  });

  it('includes Challenge when asked and can hide Copy', () => {
    const onSelect = jest.fn();
    render(<ShareDestinationRow onSelect={onSelect} showChallenge showCopy={false} />);

    expect(screen.getByTestId('share-dest-challenge')).toBeOnTheScreen();
    expect(screen.queryByTestId('share-dest-copy')).toBeNull();
    expect(screen.queryByTestId('share-dest-clip')).toBeNull();

    fireEvent.press(screen.getByTestId('share-dest-challenge'));
    expect(onSelect).toHaveBeenCalledWith('challenge');
  });
});
