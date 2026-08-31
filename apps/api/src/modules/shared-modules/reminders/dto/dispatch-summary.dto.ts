export type DispatchSummaryDto = {
  /** Reminders whose minute had arrived and whose period was still open. */
  dueCount: number;
  /** Push messages the provider accepted. */
  sentCount: number;
  /** Due reminders held back because the challenge was already done. */
  suppressedCount: number;
};
