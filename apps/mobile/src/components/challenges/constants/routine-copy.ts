import type { ChallengeFrequency } from '@product/client';

export const ROUTINE_COPY = {
  title: 'Challenges',
  addLabel: 'Add a challenge',
  rhythmTitle: {
    daily: 'Every day',
    weekly: 'Every week',
    monthly: 'Every month',
  } satisfies Record<ChallengeFrequency, string>,
  pausedTitle: 'Paused',
  pausedCorner: 'Membership ended',
  pausedMeta: 'Paused with membership',
  pausedSheetTitle: 'Paused with your membership.',
  pausedSheetBody: 'It needs membership, so it is off Today for now. Your history and points stay.',
  pausedSheetMembership: 'See membership',
  pausedSheetRemove: 'Remove it',
  emptyTitle: 'Your routine is empty.',
  emptyBody: 'Pick one or two to start. Suggestions are based on the conditions you chose.',
  errorTitle: 'Your challenges didn’t load.',
  errorBody: 'Check your connection and try again.',
  retry: 'Try again',
  loading: 'Loading your challenges',
  done: 'Done',
  notYetToday: 'Not yet today',
  photoWaiting: 'A photo check is waiting',
  reminder: 'Reminder',
  dueBy: 'Due by',
} as const;

export const CATALOG_COPY = {
  title: 'Add a challenge',
  suggestedTitle: 'Picked for you',
  everythingTitle: 'Everything',
  allFilter: 'All',
  membersTag: 'Members',
  tileAdd: 'Add',
  addButton: 'Add to my challenges',
  membershipButton: 'See membership',
  membershipBoxTitle: 'Part of membership',
  howOften: 'How often',
  goal: 'Goal',
  reminder: 'Reminder',
  seeToday: 'See Today',
  everythingAddedTitle: 'You have every challenge.',
  everythingAddedBody: 'Change settings from your routine.',
  categoryAddedBody: 'Try another category, or change settings from your routine.',
  addFailed: 'That didn’t save. Check your connection and try again.',
  errorTitle: 'The challenges didn’t load.',
  errorBody: 'Check your connection and try again.',
  retry: 'Try again',
} as const;

export const SETTINGS_COPY = {
  settingsTitle: 'Settings',
  remindersTitle: 'Reminders',
  howOften: 'How often',
  goal: 'Goal',
  measuredBy: 'Measured by',
  history: 'History',
  addReminder: 'Add a reminder',
  addAnotherReminder: 'Add another time',
  membersTag: 'Members',
  remove: 'Remove from my challenges',
  removeConfirm: 'Remove',
  keep: 'Keep it',
  removeBody: 'Your history and points stay. You can add it back any time.',
  notEnrolledTitle: 'Not in your routine.',
  notEnrolledBody: 'Add it from the catalogue to set how often and when we nudge you.',
  missingTitle: 'This challenge isn’t available.',
  missingBody: 'It may have been taken out of the catalogue.',
  saveFailed: 'That didn’t save. Check your connection and try again.',
  moreRemindersBody: 'Members can set up to five, for example a morning and an evening nudge.',
  moreRemindersMembership: 'See membership',
  notNow: 'Not now',
  goalDone: 'Done',
  historyEmptyTitle: 'Nothing here yet.',
  historyEmpty: 'Finish this challenge and it will show up here.',
  retry: 'Try again',
  historyErrorTitle: 'Your history didn’t load.',
  historyErrorBody: 'Check your connection and try again.',
  thisWeek: 'This week',
  lastWeek: 'Last week',
  weekOf: 'Week of',
} as const;

export const PUSHUP_GOAL_COPY = {
  title: 'Your push-up goal',
  sub: 'In one go. Start where you can, then raise it.',
} as const;

export const WALK_GOAL_COPY = {
  title: 'Your walk goal',
  sub: 'Minutes in one walk. Start where you can, then raise it.',
} as const;

export const DURATION_GOAL_COPY = {
  title: 'Your minutes goal',
  sub: 'Minutes in one go. Start where you can, then raise it.',
} as const;

export const REMINDER_COPY = {
  title: 'When should we nudge you?',
  anotherTime: 'Another time',
  save: 'Save',
} as const;
