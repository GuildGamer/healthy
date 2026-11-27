import { requireOptionalNativeModule } from 'expo-modules-core';
import * as SecureStore from 'expo-secure-store';
import { peekPendingMatchToken, stashPendingMatchToken } from './pending-match-token';
import { trackEvent } from './track-event';

type ClipboardModule = typeof import('expo-clipboard');

/** Clipboard / pasteboard marker written by the marketing invite page. */
export const DEFERRED_INVITE_PREFIX = 'healthy-invite:';

/** Play Install Referrer payload written into the store URL by the website. */
export const PLAY_REFERRER_INVITE_PREFIX = 'healthy_invite=';

/**
 * Set after the first clipboard probe this install so cold opens do not keep
 * triggering the iOS paste permission dialog.
 */
export const CLIPBOARD_INVITE_PROBED_KEY = 'clipboard_invite_probed';

const MATCH_TOKEN_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

let restoredOnLaunchTracked = false;

export function isMatchInviteToken(value: string | null | undefined): boolean {
  return Boolean(value && MATCH_TOKEN_PATTERN.test(value));
}

export function tokenFromDeferredMarker(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed?.startsWith(DEFERRED_INVITE_PREFIX)) {
    return null;
  }

  const token = trimmed.slice(DEFERRED_INVITE_PREFIX.length).trim();
  return isMatchInviteToken(token) ? token : null;
}

/**
 * Parse `healthy_invite=<token>` from an Android Install Referrer string
 * (or a query `referrer=` value). Fail-soft on junk.
 */
export function tokenFromPlayReferrer(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const params = new URLSearchParams(trimmed);
    const fromParam = params.get('healthy_invite');
    if (isMatchInviteToken(fromParam)) {
      return fromParam;
    }
  } catch {
    // Fall through to prefix parse.
  }

  if (!trimmed.startsWith(PLAY_REFERRER_INVITE_PREFIX)) {
    return null;
  }

  const token = trimmed.slice(PLAY_REFERRER_INVITE_PREFIX.length).trim();
  return isMatchInviteToken(token) ? token : null;
}

/**
 * Persist an invite for challenge-first post-auth. Used by deep links and
 * MatchJoinScreen when the recipient is not signed in yet.
 */
export async function stashDeferredInviteToken(
  token: string,
  source: 'deep_link' | 'web_clipboard' | 'play_referrer' = 'deep_link',
): Promise<void> {
  if (!isMatchInviteToken(token)) {
    return;
  }

  try {
    await stashPendingMatchToken(token);
    trackEvent('deferred_invite_stashed', { source, inviteToken: token });
  } catch {
    // Never block open / join on stash failure.
  }
}

function isClipboardNativeAvailable(): boolean {
  return requireOptionalNativeModule('ExpoClipboard') != null;
}

function loadClipboardModule(): ClipboardModule | null {
  try {
    // Deferred require keeps this file import-safe when ExpoClipboard is
    // absent. Prefer require so Jest mocks apply (dynamic import does not).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-clipboard') as ClipboardModule;
  } catch {
    return null;
  }
}

async function readClipboardInviteToken(): Promise<string | null> {
  if (!isClipboardNativeAvailable()) {
    return null;
  }

  const clipboard = loadClipboardModule();
  if (!clipboard) {
    return null;
  }

  try {
    const value = await clipboard.getStringAsync();
    return tokenFromDeferredMarker(value);
  } catch {
    return null;
  }
}

async function hasProbedClipboardInvite(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(CLIPBOARD_INVITE_PROBED_KEY);
    return value === '1';
  } catch {
    return false;
  }
}

async function markClipboardInviteProbed(): Promise<void> {
  try {
    await SecureStore.setItemAsync(CLIPBOARD_INVITE_PROBED_KEY, '1');
  } catch {
    // Fail-soft: a missed flag only means we may probe once more later.
  }
}

/**
 * Claim a first-party deferred invite after install / cold open.
 *
 * Order: SecureStore (universal link / prior stash) → clipboard marker from the
 * marketing invite page (at most once per install). Play Install Referrer needs
 * a native module later; `tokenFromPlayReferrer` is ready when that lands.
 *
 * Fail-soft: never throws; empty / stale clipboard returns null.
 */
export async function claimDeferredInviteToken(): Promise<string | null> {
  try {
    const existing = await peekPendingMatchToken();
    if (isMatchInviteToken(existing)) {
      trackInviteRestoredOnce('secure_store');
      return existing;
    }

    if (await hasProbedClipboardInvite()) {
      return null;
    }

    const fromClipboard = await readClipboardInviteToken();
    await markClipboardInviteProbed();

    if (!fromClipboard) {
      return null;
    }

    await stashPendingMatchToken(fromClipboard);
    trackEvent('deferred_invite_claimed', {
      source: 'clipboard',
      inviteToken: fromClipboard,
    });
    trackInviteRestoredOnce('clipboard');
    return fromClipboard;
  } catch {
    return null;
  }
}

function trackInviteRestoredOnce(source: string): void {
  if (restoredOnLaunchTracked) {
    return;
  }

  restoredOnLaunchTracked = true;
  trackEvent('invite_restored_on_launch', { source });
}

/** Test helper — resets the once-per-process restore analytics gate. */
export function resetDeferredInviteTrackingForTests(): void {
  restoredOnLaunchTracked = false;
}
