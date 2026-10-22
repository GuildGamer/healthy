import { render, screen, waitFor, within } from '@testing-library/react-native';
import { Text } from 'react-native';
import { todayChallenge } from './testing/today-fixtures';
import { TodayDeck } from './TodayDeck';
import type { ChallengeDeckItem, DeckItem } from './types/today-deck';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => 'true'),
  setItemAsync: jest.fn(async () => undefined),
}));

function card(challengeId: string): ChallengeDeckItem {
  return {
    type: 'challenge',
    key: challengeId,
    challenge: todayChallenge({ id: `uc-${challengeId}`, challengeId, title: challengeId }),
    kind: 'walk',
    position: 1,
    tag: null,
    tip: null,
    detail: null,
  };
}

const items: DeckItem[] = [card('water'), card('walk'), card('push')];

function renderDeck(focusChallengeId: string | null) {
  const onHandled = jest.fn();
  render(
    <TodayDeck
      doneCount={0}
      focus={focusChallengeId ? { challengeId: focusChallengeId, onHandled } : null}
      items={items}
      renderItem={(item) => <Text>{item.key}</Text>}
    />,
  );
  return { onHandled };
}

describe('TodayDeck focus', () => {
  it('opens on the card a reminder named, and says so', async () => {
    const { onHandled } = renderDeck('push');

    expect(within(screen.getByTestId('home-deck-top')).getByText('push')).toBeOnTheScreen();
    await waitFor(() => expect(onHandled).toHaveBeenCalled());
  });

  it('stays on the first card when the challenge is not dealt today', async () => {
    const { onHandled } = renderDeck('gym');

    expect(within(screen.getByTestId('home-deck-top')).getByText('water')).toBeOnTheScreen();
    await waitFor(() => expect(onHandled).toHaveBeenCalled());
  });
});
