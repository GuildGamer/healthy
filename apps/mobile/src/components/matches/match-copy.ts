import { MATCH_PARTICIPANT_CAP, type MatchScoringMode } from '@product/contract/match-board';
import type { WalkPhase } from '@/components/challenges/walk-session-copy';
import { formatDuration } from '@/lib/geo-session';

/**
 * How the host chooses to win. Plain language, never the enum name — the card
 * above the rows is what stops three options reading as configuration.
 */
export const MATCH_MODE_LABEL: Record<MatchScoringMode, string> = {
  best_single: 'Best set',
  cumulative_total: 'Total',
  days_completed: 'Streak',
};

export const GROUPS_COPY = {
  live: 'Live',
  doneTodayHint: 'Done today lit up',
  pastGroups: 'Past groups',
  todayCount: (done: number, total: number) => `${done} of ${total} today`,
  loadFailedTitle: 'Your groups didn’t load.',
  loadFailedBody: 'Check your connection and try again.',
  tryAgain: 'Try again',
  emptyTitle: 'Make a challenge a contest.',
  emptyBody: 'Scores come from what you already log, so there’s nothing extra to track.',
  emptySteps: [
    { title: 'Pick how you win', hint: 'Best set, total, or streak' },
    { title: 'Send one link', hint: `Up to ${MATCH_PARTICIPANT_CAP} people` },
    { title: 'Play it out', hint: 'Then run it back' },
  ],
  startGroup: 'Start a group',
  cancelled: 'cancelled',
  noPlace: '–',
} as const;

export const CREATE_COPY = {
  title: 'Start a group',
  howYouWin: 'How you win',
  activity: 'Activity',
  howLong: 'How long',
  whosIn: 'Who’s in',
  newGroupByLink: 'New group, by link',
  note: `Up to ${MATCH_PARTICIPANT_CAP} people. Groups are free for everyone, and others only see your name and score.`,
  cta: 'Start and share link',
  ctaCrew: 'Start with this crew',
  failed: 'We couldn’t start the group. Check your connection and try again.',
  done: 'Done',
  howYouWinTitle: 'How do you want to win?',
  activityTitle: 'What counts?',
  howLongTitle: 'How long does it run?',
  whosInTitle: 'Who’s in?',
  newGroup: 'New group',
  newGroupHint: 'Send a link to anyone',
  crewHint: (people: number) => `Saved crew · ${people} people`,
  crewNote: 'People from a crew get one notification, and only play once they open it.',
  today: 'Today',
  todayHint: 'Ends at midnight',
  week: '7 days',
  month: '30 days',
  other: 'Other',
  otherHint: 'Up to a year',
  fewerDays: 'Fewer days',
  moreDays: 'More days',
  daysUnit: 'days',
  streakNeedsTwo: 'A streak needs two days or more',
} as const;

export const BOARD_COPY = {
  today: 'Today',
  standings: 'Standings',
  you: 'You',
  invited: 'Invited',
  host: 'Host',
  shareLink: 'Share link',
  more: 'More options',
  cancelGroup: 'Cancel group',
  leaveGroup: 'Leave group',
  close: 'Close',
  cancelConfirmTitle: 'Cancel this group?',
  cancelConfirmBody: 'The contest stops. Scores already logged stay on the board.',
  leaveConfirmTitle: 'Leave this group?',
  leaveConfirmBody: 'Your scores leave with you, and you can only come back by link.',
  keep: 'Keep it',
  cancelFailed: 'We couldn’t cancel this group. Try again.',
  leaveFailed: 'We couldn’t take you out of this group. Try again.',
  loadFailedTitle: 'This group didn’t load.',
  waitingTitle: (groupNoun: string) => `Your ${groupNoun} group`,
  waitingBody: (rule: string) =>
    `${rule} Nobody has joined yet. Send the link and the board fills as they go.`,
  seats: (count: number) => `${count} of ${MATCH_PARTICIPANT_CAP}`,
  cancelledBody: 'This group was cancelled. Scores logged before then stay here.',
  seeResult: 'See the result',
  cheered: (name: string) => `You cheered ${name}`,
  cheeredAt: (name: string, time: string) => `You cheered ${name} at ${time}`,
  nudgedAt: (time: string) => `Nudged at ${time}. Again tomorrow.`,
  reactionFailed: 'That didn’t send. Try again.',
  nudgeTitle: (name: string) => `Nudge ${name}?`,
  nudgeNote: (name: string) => `This is what ${name} gets. One nudge per person a day.`,
  nudgeSend: 'Send nudge',
  pushApp: 'Healthy',
} as const;

export const JOIN_COPY = {
  invitedYou: (host: string) => `${host} invited you`,
  joined: (count: number) => `${count} of ${MATCH_PARTICIPANT_CAP} joined`,
  join: (host: string) => `Join ${host}’s group`,
  notNow: 'Not now',
  joinFailed: 'We couldn’t add you to this group. Try again.',
  endedTitle: 'This group has ended.',
  fullTitle: 'This group is full.',
  startOwn: (host: string) => `Start your own and send ${host} the link.`,
  startOwnCta: 'Start a group',
  invalidTitle: 'This link doesn’t work.',
  invalidBody: 'It may have been cancelled. Ask for a new one.',
  goToday: 'Go to Today',
} as const;

export const RESULT_COPY = {
  youWon: 'You won.',
  theyWon: (name: string) => `${name} won.`,
  nobodyWon: 'Nobody scored.',
  runItBack: 'Run it back',
  saveCrew: 'Save crew',
  crewSaved: 'Saved',
  share: 'Share',
  close: 'Close',
  sameAgain: 'Same again?',
  startIt: 'Start it',
  changeSomething: 'Change something',
  runItBackFailed: 'We couldn’t start it again. Try again.',
  crewSaveFailed: 'We couldn’t save that crew. Try again.',
  shareDialog: 'Share your result',
  recapEyebrow: 'Group',
  recapFinished: 'Group finished.',
  recapPlace: (place: string) => `You came ${place}.`,
  recapOfGroup: (people: number) => `of ${people} in the group`,
  recapScore: 'Your score',
  recapLength: 'Length',
} as const;

/**
 * The board counts whole minutes, so a thirty second lap would round to zero
 * and read as a bug. Saying the floor up front beats logging nothing.
 */
export const MATCH_WALK_MIN_SECONDS = 60;
export const MATCH_WALK_TITLE = 'Walk';
export const MATCH_WALK_START = 'Start walk';
export const MATCH_WALK_STOP = 'Stop';
export const MATCH_WALK_PAUSE = 'Pause';
export const MATCH_WALK_RESUME_LIVE = 'Resume';
export const MATCH_WALK_LOG = 'Add to the board';
export const MATCH_WALK_RESUME = 'Keep walking';
export const MATCH_WALK_TOO_SHORT =
  'A walk has to run a minute before it counts. Keep going and stop again.';
export const MATCH_WALK_FAILED = 'We could not add that walk. Try again.';

/** The floor, said while there is still time to walk past it. */
const MATCH_WALK_MIN_READOUT = formatDuration(MATCH_WALK_MIN_SECONDS);

/**
 * The challenge walk borrows its wording from a goal it has to reach. A
 * contest walk has none — you bank whatever you do — so the card says what is
 * being counted rather than how far off the finish is.
 *
 * The one exception is the floor: a walk under a minute scores nothing, and
 * finding that out only after stopping is how a real walk gets thrown away.
 * So the card names the floor until the walker is past it.
 */
export function matchWalkStatus({
  phase,
  autoPaused,
  userPaused = false,
  countsYet,
  saving,
  tooShort,
}: {
  phase: WalkPhase;
  autoPaused: boolean;
  /** Walker tapped Pause — movement alone will not restart the clock. */
  userPaused?: boolean;
  /** Whether the clock has already passed the floor. */
  countsYet: boolean;
  saving: boolean;
  tooShort: boolean;
}): { eyebrow: string; meta: string } {
  if (phase === 'idle') {
    return {
      eyebrow: 'Ready',
      meta: `Walks count from ${MATCH_WALK_MIN_READOUT}. Stop and yours goes on the board.`,
    };
  }

  if (phase === 'recording') {
    if (userPaused) {
      return {
        eyebrow: 'Paused',
        meta: 'Paused. Resume when you are ready to keep walking.',
      };
    }

    if (autoPaused) {
      return {
        eyebrow: 'Paused',
        meta: 'Paused while you stand still. Walk on and the clock picks up.',
      };
    }

    return countsYet
      ? { eyebrow: 'Walking', meta: 'Stop now and these minutes go on the board.' }
      : {
          eyebrow: 'Walking',
          meta: `Nothing counts until ${MATCH_WALK_MIN_READOUT}. Keep going.`,
        };
  }

  if (saving) {
    return { eyebrow: 'Adding', meta: 'Putting this walk on the board.' };
  }

  if (tooShort) {
    return { eyebrow: 'Too short', meta: MATCH_WALK_TOO_SHORT };
  }

  return { eyebrow: 'Walk done', meta: 'Add it to the board below.' };
}
