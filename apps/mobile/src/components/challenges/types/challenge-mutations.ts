import type { ChallengeFrequency, ChallengeReminder } from '@product/client';

export type GoalInput = {
  field: 'targetCount' | 'targetDurationMinutes';
  amount: number;
};

export type AddChallengeInput = {
  challengeId: string;
  frequency: ChallengeFrequency;
  /** A person's own goal, when they changed it on the preview. */
  goal: GoalInput | null;
  reminderMinute: number | null;
};

export type SaveReminderInput = {
  challengeId: string;
  minuteOfDay: number;
  /** The reminder this one takes the place of, when changing a time rather than adding one. */
  replacing: ChallengeReminder | null;
};
