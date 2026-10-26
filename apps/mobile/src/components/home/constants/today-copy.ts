import type { MatchMetric } from '@product/client';
import type { DeckCardTag } from '../types/today-deck';

export const DECK_TAG_LABEL: Record<DeckCardTag, string> = {
  extra: 'Extra',
  week: 'This week',
  month: 'This month',
};

export const TODAY_COPY = {
  lapsedTitle: 'Yesterday slipped.',
  lapsedBody: 'Today starts a new run.',
  newRun: 'New run today',
  swipeHint: 'Swipe to see what’s next',
  membershipLine: 'Members win by finishing everything.',
  membershipLink: 'See membership',
  dayDoneTitle: 'That’s the day.',
  pointsTodayLabel: 'points today',
  rankLabel: 'this week',
  tomorrowLabel: 'For tomorrow',
  shareDay: 'Share the day',
  emptySentence: 'Nothing on today yet.',
  emptyTitle: 'Start with a set.',
  emptyBody: 'Push-ups, walks, and more. Challenge a friend when you are ready.',
  emptyAction: 'See all challenges',
  errorTitle: 'Today didn’t load.',
  errorBody: 'Your progress is safe. Check your connection and try again.',
  errorAction: 'Try again',
  notYetToday: 'Not yet today',
  lastReading: 'Last reading',
  you: 'You',
  photoNeeded: 'One photo today',
  photoCheckWaiting: 'A photo check is waiting',
  groupEyebrow: 'Group',
  groupOpenBoard: 'See the board',
} as const;

/** What a group member's move means, said the way the board would. */
export const GROUP_MOVE_ACTIVITY: Record<MatchMetric | 'days_completed', string> = {
  days_completed: 'showed up today',
  pushups: 'did a set',
  walk: 'logged a walk',
  squats: 'did a set',
  plank: 'held a plank',
  jumping_jacks: 'did a set',
  burpees: 'did a set',
  sit_ups: 'did a set',
  mountain_climbers: 'did a set',
  lunges: 'did a set',
};
