/** The experiment that decides who is offered "Challenge a friend" after a finish. */
export const FRIEND_REFERRAL_EXPERIMENT = 'challenge_referral_v1';

export const FRIEND_CHALLENGE_COPY = {
  action: 'Challenge a friend',
  prompt: 'Think a friend can beat you?',
  failed: 'Could not create that challenge. Try again.',
} as const;
