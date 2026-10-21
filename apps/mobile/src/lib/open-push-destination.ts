import type { Href } from 'expo-router';

/**
 * Where a push should land. Habit slots open Today; challenge reminders open
 * that challenge. Unknown payloads stay on the tabs home.
 */
export function hrefForPushData(data: unknown): Href {
  if (!data || typeof data !== 'object') {
    return '/(tabs)';
  }

  const payload = data as Record<string, unknown>;
  const challengeId =
    typeof payload.challengeId === 'string' ? payload.challengeId.trim() : '';
  const matchId =
    typeof payload.matchId === 'string' ? payload.matchId.trim() : '';
  const destination =
    typeof payload.destination === 'string' ? payload.destination : '';

  if (matchId.length > 0) {
    // Board lives under `/matches/[matchId]`. `/match/[token]` is the invite.
    return `/matches/${matchId}`;
  }

  if (destination === 'challenge' && challengeId.length > 0) {
    return `/challenge/${challengeId}`;
  }

  if (destination === 'challenges') {
    return '/(tabs)/challenges';
  }

  if (challengeId.length > 0 && destination !== 'today') {
    return `/challenge/${challengeId}`;
  }

  return '/(tabs)';
}
