export const MATCH_NOT_FOUND = 'That group was not found.';
export const MATCH_ENDED = 'This group has ended.';
export const MATCH_FULL = 'This group is full.';
export const MATCH_NOT_PARTICIPANT = 'You are not in this group.';
export const MATCH_NOT_OPEN = 'This group is no longer open.';
export const MATCH_NOT_HOST = 'Only the host can cancel this group.';
/** The host cannot walk away from a group others joined; they cancel it. */
export const MATCH_HOST_CANNOT_LEAVE = 'The host cancels a group instead of leaving it.';
/** A cheer is for someone who has done today, a nudge for someone who has not. */
export const MATCH_REACTION_NOT_ALLOWED = 'That is not something you can send them right now.';
export const MATCH_INVALID_SOURCE = 'Only a live set on this phone counts.';
/** The attempt was captured a different way than this contest is scored. */
export const MATCH_WRONG_ACTIVITY = 'That does not count towards this group’s activity.';
export const MATCH_COUNT_TOO_LARGE = 'That score is out of range.';
export const MATCH_INVALID_SOURCE_CHALLENGE = 'That completed set cannot start a challenge.';
export const MATCH_INVALID_PARENT = 'You can only continue from a group you are in.';
/** A set that syncs after the contest settled cannot move the board. */
export const MATCH_SET_AFTER_END = 'This contest ended before your set synced.';
/** performedAt is in the future or older than the sync window. */
export const MATCH_PERFORMED_AT_INVALID = 'That set’s time is out of range.';
/** performedAt is before the contest started. */
export const MATCH_PERFORMED_BEFORE_START = 'That set happened before this contest started.';
