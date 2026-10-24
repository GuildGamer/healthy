import type { Href } from 'expo-router';
import { TODAY_FOCUS_PARAM } from './today-focus';

const SUCCESS_PARAM_KEYS = ['title', 'points', 'streak', 'count', 'target', 'metric'] as const;

function readTrimmedString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Where a push should land. Habit slots open Today; a challenge reminder opens
 * Today on that challenge's card, where it can be done; completion success rows
 * reopen the share screen. Unknown payloads stay on the tabs home.
 */
export function hrefForPushData(data: unknown): Href {
  if (!data || typeof data !== 'object') {
    return '/(tabs)';
  }

  const payload = data as Record<string, unknown>;
  const challengeId = readTrimmedString(payload, 'challengeId');
  const matchId = readTrimmedString(payload, 'matchId');
  const userChallengeId = readTrimmedString(payload, 'userChallengeId');
  const destination = typeof payload.destination === 'string' ? payload.destination : '';

  if (matchId.length > 0) {
    // Board lives under `/matches/[matchId]`. `/match/[token]` is the invite.
    return `/matches/${matchId}`;
  }

  if (destination === 'match_create') {
    const withUserId = readTrimmedString(payload, 'withUserId');
    return {
      pathname: '/matches/create',
      params: withUserId.length > 0 ? { participantUserIds: withUserId } : {},
    };
  }

  if (userChallengeId.length > 0) {
    const params: Record<string, string> = { userChallengeId };
    for (const key of SUCCESS_PARAM_KEYS) {
      const value = readTrimmedString(payload, key);
      if (value.length > 0) {
        params[key] = value;
      }
    }
    return {
      pathname: '/challenge/success',
      params,
    };
  }

  if (destination === 'challenges') {
    return '/(tabs)/challenges';
  }

  if (challengeId.length > 0) {
    return { pathname: '/(tabs)', params: { [TODAY_FOCUS_PARAM]: challengeId } };
  }

  return '/(tabs)';
}

/**
 * True when an inbox row should be tappable. Empty / null payloads stay inert
 * so we do not send people Home for no reason.
 */
export function isNavigablePushData(data: unknown): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const payload = data as Record<string, unknown>;
  const challengeId = readTrimmedString(payload, 'challengeId');
  const matchId = readTrimmedString(payload, 'matchId');
  const userChallengeId = readTrimmedString(payload, 'userChallengeId');
  const destination = typeof payload.destination === 'string' ? payload.destination : '';

  if (matchId.length > 0) {
    return true;
  }

  if (destination === 'match_create') {
    return true;
  }

  if (userChallengeId.length > 0) {
    return true;
  }

  if (destination === 'challenges') {
    return true;
  }

  if (destination === 'today') {
    return true;
  }

  if (destination === 'challenge' && challengeId.length > 0) {
    return true;
  }

  if (challengeId.length > 0 && destination !== 'today') {
    return true;
  }

  return false;
}
