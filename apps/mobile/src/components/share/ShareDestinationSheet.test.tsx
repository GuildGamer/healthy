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

const linkPayload = {
  caption: 'I did 40 push-ups. Think you can beat me?',
  inviteUrl: 'https://beatset.tech/match/tok',
  artifact: { kind: 'link' as const },
};

describe('ShareDestinationSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('closes the sheet before opening a destination', async () => {
    const onClose = jest.fn();
    const order: string[] = [];
    onClose.mockImplementation(() => {
      order.push('close');
    });
    (openShareDestination as jest.Mock).mockImplementation(async () => {
      order.push('open');
    });

    render(
      <ShareDestinationSheet onClose={onClose} payload={linkPayload} visible />,
    );

    fireEvent.press(screen.getByTestId('share-dest-whatsapp'));

    expect(onClose).toHaveBeenCalled();
    expect(openShareDestination).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(openShareDestination).toHaveBeenCalledWith(
        'whatsapp',
        expect.objectContaining({
          inviteUrl: 'https://beatset.tech/match/tok',
          artifact: { kind: 'link' },
        }),
      );
    });
    expect(order).toEqual(['close', 'open']);
  });

  it('stays usable when the destination cancels', async () => {
    const onClose = jest.fn();
    const onShared = jest.fn();
    (openShareDestination as jest.Mock).mockRejectedValueOnce(new Error('Share canceled'));

    render(
      <ShareDestinationSheet
        onClose={onClose}
        onShared={onShared}
        payload={linkPayload}
        visible
      />,
    );

    fireEvent.press(screen.getByTestId('share-dest-whatsapp'));

    await waitFor(() => {
      expect(openShareDestination).toHaveBeenCalled();
    });
    expect(onClose).toHaveBeenCalled();
    expect(onShared).not.toHaveBeenCalled();
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
