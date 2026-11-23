import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { openShareDestination } from '@/components/matches/share-destination';
import { ShareDestinationSheet } from './ShareDestinationSheet';

jest.mock('@/components/matches/share-destination', () => ({
  openShareDestination: jest.fn(async () => undefined),
}));

jest.mock('@/components/deck', () => {
  const { View, Text } = require('react-native');
  return {
    DeckSheetModal: ({
      children,
      visible,
      testID,
      title,
    }: {
      children: React.ReactNode;
      visible: boolean;
      testID?: string;
      title?: string;
    }) =>
      visible ? (
        <View testID={testID}>
          {title ? <Text>{title}</Text> : null}
          {children}
        </View>
      ) : null,
  };
});

describe('ShareDestinationSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens WhatsApp with the invite payload and closes', async () => {
    const onClose = jest.fn();
    render(
      <ShareDestinationSheet
        onClose={onClose}
        payload={{
          caption: 'I did 40 push-ups. Think you can beat me?',
          inviteUrl: 'https://beatset.tech/match/tok',
          artifact: { kind: 'link' },
        }}
        visible
      />,
    );

    fireEvent.press(screen.getByTestId('share-dest-whatsapp'));

    await waitFor(() => {
      expect(openShareDestination).toHaveBeenCalledWith(
        'whatsapp',
        expect.objectContaining({
          inviteUrl: 'https://beatset.tech/match/tok',
          artifact: { kind: 'link' },
        }),
      );
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('delegates Challenge without opening a destination', async () => {
    const onChallenge = jest.fn();
    const onClose = jest.fn();
    render(
      <ShareDestinationSheet
        onChallenge={onChallenge}
        onClose={onClose}
        payload={{ caption: 'Think you can beat me?', artifact: { kind: 'link' } }}
        showChallenge
        visible
      />,
    );

    fireEvent.press(screen.getByTestId('share-dest-challenge'));

    await waitFor(() => {
      expect(onChallenge).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
    expect(openShareDestination).not.toHaveBeenCalled();
  });
});
