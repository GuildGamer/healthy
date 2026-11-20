import * as Clipboard from 'expo-clipboard';
import { requireOptionalNativeModule } from 'expo-modules-core';
import * as SecureStore from 'expo-secure-store';
import {
  CLIPBOARD_INVITE_PROBED_KEY,
  DEFERRED_INVITE_PREFIX,
  claimDeferredInviteToken,
  resetDeferredInviteTrackingForTests,
  stashDeferredInviteToken,
  tokenFromDeferredMarker,
  tokenFromPlayReferrer,
} from './deferred-invite';
import { trackEvent } from './track-event';

jest.mock('./track-event', () => ({
  trackEvent: jest.fn(),
}));

jest.mock('expo-modules-core', () => {
  const actual = jest.requireActual('expo-modules-core') as object;
  return {
    ...actual,
    requireOptionalNativeModule: jest.fn(),
  };
});

const mockedRequireOptionalNativeModule = jest.mocked(requireOptionalNativeModule);

const PENDING_MATCH_TOKEN_KEY = 'pending_match_token';

function mockSecureStoreItems(items: Record<string, string | null> = {}): void {
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async (key) => {
    return items[key] ?? null;
  });
}

describe('tokenFromDeferredMarker', () => {
  it('parses a valid marker', () => {
    expect(tokenFromDeferredMarker(`${DEFERRED_INVITE_PREFIX}abc_token-1`)).toBe('abc_token-1');
  });

  it('rejects junk and short tokens', () => {
    expect(tokenFromDeferredMarker('not-an-invite')).toBeNull();
    expect(tokenFromDeferredMarker(`${DEFERRED_INVITE_PREFIX}short`)).toBeNull();
    expect(tokenFromDeferredMarker(null)).toBeNull();
    expect(tokenFromDeferredMarker('')).toBeNull();
  });
});

describe('tokenFromPlayReferrer', () => {
  it('parses a referrer query payload', () => {
    expect(tokenFromPlayReferrer('healthy_invite=abc_token-1')).toBe('abc_token-1');
    expect(tokenFromPlayReferrer('utm_source=x&healthy_invite=abc_token-1')).toBe('abc_token-1');
  });

  it('rejects empty or invalid referrers', () => {
    expect(tokenFromPlayReferrer(null)).toBeNull();
    expect(tokenFromPlayReferrer('')).toBeNull();
    expect(tokenFromPlayReferrer('healthy_invite=short')).toBeNull();
  });
});

describe('claimDeferredInviteToken', () => {
  beforeEach(() => {
    resetDeferredInviteTrackingForTests();
    jest.mocked(SecureStore.getItemAsync).mockReset();
    jest.mocked(SecureStore.setItemAsync).mockReset();
    jest.mocked(Clipboard.getStringAsync).mockReset();
    jest.mocked(trackEvent).mockReset();
    mockedRequireOptionalNativeModule.mockReset();
    mockSecureStoreItems();
    jest.mocked(SecureStore.setItemAsync).mockResolvedValue(undefined);
    jest.mocked(Clipboard.getStringAsync).mockResolvedValue('');
    mockedRequireOptionalNativeModule.mockReturnValue({});
  });

  it('returns an existing SecureStore token without reading clipboard', async () => {
    mockSecureStoreItems({ [PENDING_MATCH_TOKEN_KEY]: 'stored_tok1' });

    await expect(claimDeferredInviteToken()).resolves.toBe('stored_tok1');
    expect(Clipboard.getStringAsync).not.toHaveBeenCalled();
    expect(trackEvent).toHaveBeenCalledWith('invite_restored_on_launch', {
      source: 'secure_store',
    });
  });

  it('claims a clipboard marker into SecureStore', async () => {
    jest.mocked(Clipboard.getStringAsync).mockResolvedValue(`${DEFERRED_INVITE_PREFIX}clip_token1`);

    await expect(claimDeferredInviteToken()).resolves.toBe('clip_token1');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(CLIPBOARD_INVITE_PROBED_KEY, '1');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(PENDING_MATCH_TOKEN_KEY, 'clip_token1');
    expect(trackEvent).toHaveBeenCalledWith('deferred_invite_claimed', {
      source: 'clipboard',
      inviteToken: 'clip_token1',
    });
  });

  it('skips clipboard when already probed this install', async () => {
    mockSecureStoreItems({ [CLIPBOARD_INVITE_PROBED_KEY]: '1' });
    jest.mocked(Clipboard.getStringAsync).mockResolvedValue(`${DEFERRED_INVITE_PREFIX}clip_token1`);

    await expect(claimDeferredInviteToken()).resolves.toBeNull();
    expect(Clipboard.getStringAsync).not.toHaveBeenCalled();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('marks probed after an empty clipboard read', async () => {
    jest.mocked(Clipboard.getStringAsync).mockResolvedValue('');

    await expect(claimDeferredInviteToken()).resolves.toBeNull();
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(CLIPBOARD_INVITE_PROBED_KEY, '1');
    expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith(
      PENDING_MATCH_TOKEN_KEY,
      expect.anything(),
    );
  });

  it('fails soft on stale / invalid clipboard marker', async () => {
    jest.mocked(Clipboard.getStringAsync).mockResolvedValue(`${DEFERRED_INVITE_PREFIX}short`);

    await expect(claimDeferredInviteToken()).resolves.toBeNull();
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(CLIPBOARD_INVITE_PROBED_KEY, '1');
    expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith(
      PENDING_MATCH_TOKEN_KEY,
      expect.anything(),
    );
  });

  it('fails soft when clipboard throws', async () => {
    jest.mocked(Clipboard.getStringAsync).mockRejectedValue(new Error('denied'));

    await expect(claimDeferredInviteToken()).resolves.toBeNull();
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(CLIPBOARD_INVITE_PROBED_KEY, '1');
  });

  it('skips the clipboard when ExpoClipboard is not linked', async () => {
    mockedRequireOptionalNativeModule.mockReturnValue(null);
    jest.mocked(Clipboard.getStringAsync).mockResolvedValue(`${DEFERRED_INVITE_PREFIX}clip_token1`);

    await expect(claimDeferredInviteToken()).resolves.toBeNull();
    expect(Clipboard.getStringAsync).not.toHaveBeenCalled();
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(CLIPBOARD_INVITE_PROBED_KEY, '1');
  });
});

describe('stashDeferredInviteToken', () => {
  beforeEach(() => {
    jest.mocked(SecureStore.setItemAsync).mockReset();
    jest.mocked(trackEvent).mockReset();
  });

  it('stashes a valid token and tracks', async () => {
    await stashDeferredInviteToken('deep_token1', 'deep_link');

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('pending_match_token', 'deep_token1');
    expect(trackEvent).toHaveBeenCalledWith('deferred_invite_stashed', {
      source: 'deep_link',
      inviteToken: 'deep_token1',
    });
  });

  it('ignores invalid tokens', async () => {
    await stashDeferredInviteToken('short', 'deep_link');
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });
});
