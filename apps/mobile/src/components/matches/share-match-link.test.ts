import { Platform, Share } from 'react-native';
import { shareMatchLink } from './share-match-link';

const INVITE_URL = 'https://gethealthyapp.com/match/tok-1';

function setPlatformOs(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    get: () => os,
  });
}

function inviteUrlCount(content: { message?: string; url?: string }): number {
  const inMessage = content.message ? content.message.split(INVITE_URL).length - 1 : 0;
  const inUrl = content.url ? content.url.split(INVITE_URL).length - 1 : 0;
  return inMessage + inUrl;
}

describe('shareMatchLink', () => {
  const originalOs = Platform.OS;

  beforeEach(() => {
    jest.spyOn(Share, 'share').mockResolvedValue({
      action: Share.sharedAction,
    });
  });

  afterEach(() => {
    setPlatformOs(originalOs);
    jest.restoreAllMocks();
  });

  it('shares one invite link on iOS for a group link', async () => {
    setPlatformOs('ios');

    await shareMatchLink(INVITE_URL);

    expect(Share.share).toHaveBeenCalledTimes(1);
    const content = shareContent();
    expect(content).toEqual({ url: INVITE_URL });
    expect(inviteUrlCount(content)).toBe(1);
  });

  it('keeps the score line and still shares the invite once on iOS', async () => {
    setPlatformOs('ios');

    await shareMatchLink({
      url: INVITE_URL,
      hostScore: 20,
      metricLabel: 'push-ups',
    });

    expect(Share.share).toHaveBeenCalledTimes(1);
    const content = shareContent();
    expect(content.message).toBe('I did 20 push-ups. Think you can beat me?');
    expect(content.url).toBe(INVITE_URL);
    expect(inviteUrlCount(content)).toBe(1);
  });

  it('puts the invite in the Android message once', async () => {
    setPlatformOs('android');

    await shareMatchLink(INVITE_URL);

    expect(Share.share).toHaveBeenCalledTimes(1);
    const content = shareContent();
    expect(content).toEqual({ message: INVITE_URL });
    expect(inviteUrlCount(content)).toBe(1);
  });

  it('puts the score line and one invite in the Android message', async () => {
    setPlatformOs('android');

    await shareMatchLink({
      url: INVITE_URL,
      hostScore: 20,
      metricLabel: 'push-ups',
    });

    expect(Share.share).toHaveBeenCalledTimes(1);
    const content = shareContent();
    expect(content).toEqual({
      message: `I did 20 push-ups. Think you can beat me?\n${INVITE_URL}`,
    });
    expect(inviteUrlCount(content)).toBe(1);
  });
});

function shareContent(): { message?: string; url?: string } {
  const share = Share.share as jest.MockedFunction<typeof Share.share>;
  const content = share.mock.calls[0]?.[0];
  if (content == null) {
    throw new Error('Share.share was not called');
  }
  return content;
}
