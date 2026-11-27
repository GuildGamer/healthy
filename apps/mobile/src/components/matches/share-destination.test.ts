import { Linking, Platform, Share } from 'react-native';
import { shareToInstagramStories, shareToWhatsApp } from 'share-destination';
import { openShareDestination } from './share-destination';

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(async () => true),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));

jest.mock('@/lib/config', () => ({
  ...jest.requireActual<typeof import('@/lib/config')>('@/lib/config'),
  FACEBOOK_APP_ID: '1234567890',
}));

jest.mock('@/lib/analytics', () => ({
  shareWithTracking: jest.fn(async (_surface: string, content: unknown) => {
    const { Share } = require('react-native') as typeof import('react-native');
    return Share.share(content as never);
  }),
}));

const { setStringAsync } = jest.requireMock('expo-clipboard') as {
  setStringAsync: jest.Mock;
};
const { shareAsync, isAvailableAsync } = jest.requireMock('expo-sharing') as {
  shareAsync: jest.Mock;
  isAvailableAsync: jest.Mock;
};
const shareToInstagramStoriesMock = shareToInstagramStories as jest.MockedFunction<
  typeof shareToInstagramStories
>;
const shareToWhatsAppMock = shareToWhatsApp as jest.MockedFunction<typeof shareToWhatsApp>;

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
    shareToInstagramStoriesMock.mockResolvedValue(false);
    shareToWhatsAppMock.mockResolvedValue(false);
  });

  afterEach(() => {
    setPlatformOs(originalOs);
    jest.restoreAllMocks();
  });

  it('opens WhatsApp with the caption and invite once for a link', async () => {
    await openShareDestination('whatsapp', {
      caption: 'I did 40 push-ups. Think you can beat me?',
      inviteUrl: 'https://beatset.tech/match/tok',
      artifact: { kind: 'link' },
    });

    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining('whatsapp://send?text='),
    );
    const opened = (Linking.openURL as jest.Mock).mock.calls[0]?.[0] as string;
    const decoded = decodeURIComponent(opened.replace('whatsapp://send?text=', ''));
    expect(decoded).toContain('I did 40 push-ups. Think you can beat me?');
    expect(decoded.split('https://beatset.tech/match/tok').length - 1).toBe(1);
  });

  it('opens Messages with the caption on iOS for a link', async () => {
    await openShareDestination('messages', {
      caption: 'I did 40 push-ups. Think you can beat me?',
      inviteUrl: 'https://beatset.tech/match/tok',
      artifact: { kind: 'link' },
    });

    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringMatching(/^sms:&body=/),
    );
  });

  it('copies the invite URL when present', async () => {
    await openShareDestination('copy', {
      caption: 'I did 40 push-ups. Think you can beat me?',
      inviteUrl: 'https://beatset.tech/match/tok',
      artifact: { kind: 'link' },
    });

    expect(setStringAsync).toHaveBeenCalledWith('https://beatset.tech/match/tok');
  });

  it('copies the caption when there is no invite', async () => {
    await openShareDestination('copy', {
      caption: 'I did 40 push-ups. Think you can beat me?',
      artifact: { kind: 'image', posterUri: 'file:///tmp/poster.png' },
    });

    expect(setStringAsync).toHaveBeenCalledWith('I did 40 push-ups. Think you can beat me?');
  });

  it('shares the full clip as video for WhatsApp, Messages, X, and More', async () => {
    for (const destination of ['whatsapp', 'messages', 'x', 'overflow'] as const) {
      jest.clearAllMocks();
      isAvailableAsync.mockResolvedValue(true);
      await openShareDestination(destination, {
        caption: 'I did 40 push-ups.',
        artifact: {
          kind: 'video',
          clipUri: 'file:///tmp/clip.mp4',
          socialClipUri: 'file:///tmp/social.mp4',
        },
      });

      expect(Linking.openURL).not.toHaveBeenCalled();
      expect(shareAsync).toHaveBeenCalledWith(
        'file:///tmp/clip.mp4',
        expect.objectContaining({ mimeType: 'video/mp4' }),
      );
    }
  });

  it('opens Status via the system sheet on iOS with the social cut', async () => {
    await openShareDestination('status', {
      caption: 'I did 40.',
      artifact: {
        kind: 'video',
        clipUri: 'file:///tmp/clip.mp4',
        socialClipUri: 'file:///tmp/social.mp4',
      },
    });

    expect(shareToWhatsAppMock).not.toHaveBeenCalled();
    expect(shareAsync).toHaveBeenCalledWith(
      'file:///tmp/social.mp4',
      expect.objectContaining({ mimeType: 'video/mp4' }),
    );
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('hands Status to WhatsApp on Android when the native share succeeds', async () => {
    setPlatformOs('android');
    shareToWhatsAppMock.mockResolvedValue(true);

    await openShareDestination('status', {
      caption: 'I did 40.',
      artifact: {
        kind: 'video',
        clipUri: 'file:///tmp/clip.mp4',
        socialClipUri: 'file:///tmp/social.mp4',
      },
    });

    expect(shareToWhatsAppMock).toHaveBeenCalledWith({
      fileUri: 'file:///tmp/social.mp4',
      mimeType: 'video/mp4',
      caption: 'I did 40.',
    });
    expect(shareAsync).not.toHaveBeenCalled();
  });

  it('opens Instagram Stories with the poster for an image artifact', async () => {
    shareToInstagramStoriesMock.mockResolvedValue(true);

    await openShareDestination('instagram', {
      caption: 'I did 40.',
      artifact: { kind: 'image', posterUri: 'file:///tmp/poster.png' },
    });

    expect(shareToInstagramStoriesMock).toHaveBeenCalledWith({
      appId: '1234567890',
      backgroundImageUri: 'file:///tmp/poster.png',
    });
    expect(shareAsync).not.toHaveBeenCalled();
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('opens Instagram Stories with the social cut for a video artifact', async () => {
    shareToInstagramStoriesMock.mockResolvedValue(true);

    await openShareDestination('instagram', {
      caption: 'I did 40.',
      artifact: {
        kind: 'video',
        clipUri: 'file:///tmp/clip.mp4',
        socialClipUri: 'file:///tmp/social.mp4',
      },
    });

    expect(shareToInstagramStoriesMock).toHaveBeenCalledWith({
      appId: '1234567890',
      backgroundVideoUri: 'file:///tmp/social.mp4',
    });
    expect(shareAsync).not.toHaveBeenCalled();
  });

  it('falls back to the system sheet when Instagram Stories handoff fails for an image', async () => {
    shareToInstagramStoriesMock.mockResolvedValue(false);

    await openShareDestination('instagram', {
      caption: 'I did 40.',
      artifact: { kind: 'image', posterUri: 'file:///tmp/poster.png' },
    });

    expect(shareAsync).toHaveBeenCalledWith(
      'file:///tmp/poster.png',
      expect.objectContaining({ mimeType: 'image/png' }),
    );
  });

  it('shares the poster image for More', async () => {
    await openShareDestination('overflow', {
      caption: 'I did 40.',
      artifact: { kind: 'image', posterUri: 'file:///tmp/poster.png' },
    });

    expect(shareAsync).toHaveBeenCalledWith(
      'file:///tmp/poster.png',
      expect.objectContaining({ mimeType: 'image/png' }),
    );
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('opens X via the Twitter deep link for a link', async () => {
    await openShareDestination('x', {
      caption: 'I did 40. Think you can beat me?',
      inviteUrl: 'https://beatset.tech/match/tok',
      artifact: { kind: 'link' },
    });

    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining('twitter://post?message='),
    );
  });

  it('falls back to the system sheet for WhatsApp when the app is missing on a link', async () => {
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(false);

    await openShareDestination('whatsapp', {
      caption: 'I did 40. Think you can beat me?',
      inviteUrl: 'https://beatset.tech/match/tok',
      artifact: { kind: 'link' },
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
