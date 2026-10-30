export const MATCH_INVITE_TOKEN_BYTES = 16;

/** Rows a listed contest carries, enough to show the race on a card. */
export const MATCH_LIST_ROSTER_SIZE = 3;

/**
 * Device-activity external ids written from a contest set. Walk contests already
 * score the MatchAttempt, so tracked-walk reads must skip these rows or the
 * same minutes land on the board twice.
 */
export const MATCH_ATTEMPT_ACTIVITY_EXTERNAL_PREFIX = 'match-attempt:';

export function matchAttemptActivityExternalId(attemptId: string): string {
  return `${MATCH_ATTEMPT_ACTIVITY_EXTERNAL_PREFIX}${attemptId}`;
}
