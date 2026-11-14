export const SUCCESS_COPY = {
  dayFinished: 'That’s the day.',
  complete: 'Challenge complete',
  extraSet: 'Extra set',
  sharePrompt: 'Post it to your story or send it to a friend.',
  share: 'Share',
  shareResult: 'Share result',
  shareDialog: 'Share your Healthy win',
  prepareFailed: 'Could not prepare that image. Try again.',
  sharingUnavailable: 'Sharing is not available on this device.',
  shareFailed: 'Could not share that image. Try again.',
  /** Saved on the phone; waiting for the server. */
  savedSyncing: 'Saved on your phone · syncing',
  /** Confirmed on the server (or never needed a sync). */
  saved: 'Saved',
  notNow: 'Not now',
  backToGroup: 'Back to group',
  seeNext: 'See what’s next',
  unlockMembership: 'Unlock membership',
  photoCheckMissed: 'Photo check missed',
  penaltyLine: 'points were deducted. Tomorrow is a fresh start.',
  goalLadderPrompt: (nextTarget: number, metricUnit: string) =>
    `Ready for ${nextTarget} ${metricUnit}?`,
  goalLadderAccept: (nextTarget: number) => `Yes. Make it ${nextTarget}`,
  goalLadderDecline: 'Not now',
} as const;
