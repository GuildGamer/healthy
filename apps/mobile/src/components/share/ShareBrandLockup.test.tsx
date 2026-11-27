import { darkDeckCards, lightDeckCards } from '@product/brand';
import { render, screen } from '@testing-library/react-native';
import { Path } from 'react-native-svg';
import { ShareBrandLockup } from './ShareBrandLockup';

function lockupFills(): string[] {
  return screen
    .UNSAFE_getAllByType(Path)
    .map((node) => node.props.fill)
    .filter((fill): fill is string => typeof fill === 'string');
}

describe('ShareBrandLockup', () => {
  it('exposes Beatset for accessibility and paints clinic navy', () => {
    render(<ShareBrandLockup color={lightDeckCards.text} />);

    expect(screen.getByTestId('share-brand-lockup')).toHaveProp('accessibilityLabel', 'Beatset');
    expect(lockupFills()).toEqual([lightDeckCards.text, lightDeckCards.text]);
  });

  it('paints night white on activity fills', () => {
    render(<ShareBrandLockup color={darkDeckCards.text} />);

    expect(lockupFills()).toEqual([darkDeckCards.text, darkDeckCards.text]);
  });
});
