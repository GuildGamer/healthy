export const REMINDER_SITUATIONS = [
  'awaiting_evidence',
  'in_progress_partial',
  'in_progress_none',
  'missed_yesterday',
  'first_week',
  'morning_nothing_done',
  'midday_almost_done',
  'evening_streak',
  'evening_open',
  'open_default',
] as const;

export type ReminderSituation = (typeof REMINDER_SITUATIONS)[number];

export type ReminderNudgeKind = 'habit_slot' | 'clock_reminder' | 'in_progress_nudge';

export type ReminderLeadChallenge = {
  challengeId: string;
  slug: string;
  title: string;
  deviceMetric: string | null;
  completionKind: string;
  /** Resolved target count when the challenge is count-based. */
  targetCount: number | null;
  /** Progress toward the target when known (draft or device log). */
  measuredCount: number | null;
  status: 'pending' | 'in_progress' | 'awaiting_evidence' | 'completed' | null;
};

export type ReminderContext = {
  userId: string;
  dayKey: string;
  /** Local wall-clock minutes past midnight. */
  localMinute: number;
  nudgeKind: ReminderNudgeKind;
  firstName: string | null;
  streakDays: number;
  openCount: number;
  doneCount: number;
  missedYesterday: boolean;
  firstWeek: boolean;
  lead: ReminderLeadChallenge | null;
  /** Linked tip body for occasional "why it matters" push append. */
  benefitBody: string | null;
};

export type ComposedReminderCopy = {
  title: string;
  body: string;
  situation: ReminderSituation;
  templateKey: string;
  copyVersion: 'v1a' | 'v1b';
};
