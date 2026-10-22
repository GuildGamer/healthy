import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { DECK_CARD_RADIUS } from './constants';
import { DeckCardFrame } from './DeckCardFrame';

describe('DeckCardFrame', () => {
  it('pins the footer below a body that gives way instead of pushing it out', () => {
    render(
      <DeckCardFrame fill="#164A3D" footer={<Text>Start set</Text>} testID="card">
        <Text>A title long enough to wrap onto more lines than the card has room for</Text>
      </DeckCardFrame>,
    );

    const footer = screen.getByTestId('card-footer');
    const body = screen.getByTestId('card-body');

    expect(body).toHaveStyle({ flex: 1, minHeight: 0, overflow: 'hidden' });
    expect(footer).toHaveStyle({ flexShrink: 0 });
    expect(footer).toContainElement(screen.getByText('Start set'));
  });

  it('clips the tone rail to the card’s rounded corners instead of drawing a square bar', () => {
    render(
      <DeckCardFrame fill="#FFFFFF" railColor="#0FA36B">
        <Text>Ten-minute walk</Text>
      </DeckCardFrame>,
    );

    const clip = screen.getByTestId('deck-card-rail-clip');
    expect(clip).toHaveStyle({ overflow: 'hidden', borderRadius: DECK_CARD_RADIUS });
    expect(clip).toContainElement(screen.getByTestId('deck-card-rail'));
  });
});
