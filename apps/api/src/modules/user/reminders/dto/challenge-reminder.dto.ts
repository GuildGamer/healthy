export type ChallengeReminderDto = {
  id: string;
  /** Local wall-clock minutes past midnight. */
  minuteOfDay: number;
};

/** The full reminder set for one challenge, so the client can replace not merge. */
export type ChallengeRemindersDto = {
  challengeId: string;
  reminders: ChallengeReminderDto[];
};
