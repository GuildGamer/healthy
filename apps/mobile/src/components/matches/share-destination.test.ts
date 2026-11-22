import { Linking, Platform, Share } from 'react-native';
import { openShareDestination } from './share-destination';

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(async () => true),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));

const { setStringAsync } = jest.requireMock('expo-clipboard') as {
  setStringAsync: jest.Mock;
};
const { shareAsync, isAvailableAsync } = jest.requireMock('expo-sharing') as {
  shareAsync: jest.Mock;
  isAvailableAsync: jest.Mock;
};

function setPlatformOs(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    get: () => os,
  });
}

describe('openShareDestination', () => {
  const originalOs = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    setPlatformOs('ios');
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
    isAvailableAsync.mockResolvedValue(true);
  });

  afterEach(() => {
    setPlatformOs(originalOs);
    jest.restoreAllMocks();
  });

  it('opens WhatsApp with the caption and invite once', async () => {
    await openShareDestination('whatsapp', {
      caption: 'I did 40 push-ups. Think you can beat me?',
      inviteUrl: 'https://beatset.tech/match/tok',
    });

    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining('whatsapp://send?text='),
    );
    const opened = (Linking.openURL as jest.Mock).mock.calls[0]?.[0] as string;
    const decoded = decodeURIComponent(opened.replace('whatsapp://send?text=', ''));
    expect(decoded).toContain('I did 40 push-ups. Think you can beat me?');
    expect(decoded.split('https://beatset.tech/match/tok').length - 1).toBe(1);
  });

  it('opens Messages with the caption on iOS', async () => {
    await openShareDestination('messages', {
      caption: 'I did 40 push-ups. Think you can beat me?',
      inviteUrl: 'https://beatset.tech/match/tok',
    });

    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringMatching(/^sms:&body=/),
    );
  });

  it('copies the invite URL when present', async () => {
    await openShareDestination('copy', {
      caption: 'I did 40 push-ups. Think you can beat me?',
      inviteUrl: 'https://beatset.tech/match/tok',
    });

    expect(setStringAsync).toHaveBeenCalledWith('https://beatset.tech/match/tok');
  });

  it('copies the caption when there is no invite', async () => {
    await openShareDestination('copy', {
      caption: 'I did 40 push-ups. Think you can beat me?',
    });

    expect(setStringAsync).toHaveBeenCalledWith('I did 40 push-ups. Think you can beat me?');
  });

  it('shares the local clip file without waiting on anything else', async () => {
    await openShareDestination('clip', {
      caption: 'I did 40 push-ups.',
      clipUri: 'file:///tmp/clip.mp4',
    });

    expect(shareAsync).toHaveBeenCalledWith('file:///tmp/clip.mp4', expect.any(Object));
  });

  it('falls back to the system sheet for WhatsApp when the app is missing', async () => {
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(false);

    await openShareDestination('whatsapp', {
      caption: 'I did 40. Think you can beat me?',
      inviteUrl: 'https://beatset.tech/match/tok',
    });

    expect(Share.share).toHaveBeenCalledTimes(1);
    const content = (Share.share as jest.Mock).mock.calls[0]?.[0] as {
      message?: string;
      url?: string;
    };
    expect(content.message).toContain('I did 40. Think you can beat me?');
    expect(content.url).toBe('https://beatset.tech/match/tok');
  });
});
