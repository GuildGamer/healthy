/** Why a push was sent. Used for logs now; becomes the delivery-log source later. */
export const ENGAGEMENT_SOURCES = [
  'habit_slot',
  'clock_reminder',
  'in_progress_nudge',
  'invite_accepted',
  'board_move',
  'match_reaction',
  'crew_seat',
  'completion',
  'admin_broadcast',
] as const;

export type EngagementSource = (typeof ENGAGEMENT_SOURCES)[number];
