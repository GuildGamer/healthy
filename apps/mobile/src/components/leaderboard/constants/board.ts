/** The podium everyone sees, whatever their own place. */
export const BOARD_TOP_COUNT = 3;

/** Near the top the board is one unbroken list this long, with you in it. */
export const BOARD_NEAR_TOP_LENGTH = 6;

/** Rows shown under the headline when you have no place to anchor to. */
export const BOARD_UNRANKED_LENGTH = 5;

export const BOARD_COPY = {
  title: 'This week',
  youre: 'You’re',
  yourPlace: 'Your place',
  notYet: 'Not yet',
  hidden: 'Hidden',
  you: 'You',
  topSection: 'Top',
  resets: 'Resets Monday.',
  joinLine: 'Finish one challenge to join this week’s board.',
  hiddenLine: 'Nobody sees your name or points. They still count for you.',
  showMe: 'Show me on the board',
  firstLine: 'You’re top of the board. Resets Monday.',
  emptyTitle: 'Nobody’s on the board yet',
  emptyBody: 'Finish a challenge and you’ll be first this week.',
  failedTitle: 'The board didn’t load.',
  failedBody: 'Check your connection and try again.',
  tryAgain: 'Try again',
  howItWorks: 'How the board works',
  gotIt: 'Got it',
  hiddenMeta: 'You’re hidden from the board',
  unrankedMeta: 'Finish one challenge to join',
  firstMeta: 'Top of the board this week',
} as const;
