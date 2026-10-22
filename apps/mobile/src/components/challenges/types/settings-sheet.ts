import type { ChallengeReminder } from '@product/client';

/** Which sheet a challenge's settings has open. */
export type SettingsSheet =
  | { kind: 'goal' }
  /** A new reminder when `replacing` is null, else a change of that one's time. */
  | { kind: 'reminder'; replacing: ChallengeReminder | null }
  | { kind: 'moreReminders' };
