import type { Href } from 'expo-router';

/** Search param that picks Mine or Groups on the challenges tab. */
export const CHALLENGES_SEGMENT_PARAM = 'segment';

export type ChallengesSegment = 'groups' | 'mine';

/** Groups first: the social loop is the default when someone opens Challenges. */
export const CHALLENGES_SEGMENTS = [
  { id: 'groups', label: 'Groups' },
  { id: 'mine', label: 'Mine' },
] as const satisfies readonly { id: ChallengesSegment; label: string }[];

export const DEFAULT_CHALLENGES_SEGMENT: ChallengesSegment = 'groups';

/** Accepts only a known segment; anything else falls back to Groups. */
export function parseChallengesSegment(value: string | string[] | undefined): ChallengesSegment {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'mine' || raw === 'groups') {
    return raw;
  }
  return DEFAULT_CHALLENGES_SEGMENT;
}

/**
 * Route into the challenges tab on a specific segment. Omit the segment for
 * Groups (the default); personal-challenge exits pass `'mine'`.
 */
export function challengesTabHref(segment?: ChallengesSegment): Href {
  if (!segment || segment === DEFAULT_CHALLENGES_SEGMENT) {
    return '/(tabs)/challenges';
  }
  return `/(tabs)/challenges?${CHALLENGES_SEGMENT_PARAM}=${segment}`;
}
