/**
 * In-memory flags for the current app session. Keeps the automatic review
 * prompt off the same path as a membership CTA or a photo-check penalty.
 */

let membershipCtaShownThisSession = false;
let lastSuccessWasPenalty = false;
let promptAttemptedThisSession = false;

export function markMembershipCtaShownThisSession(): void {
  membershipCtaShownThisSession = true;
}

export function wasMembershipCtaShownThisSession(): boolean {
  return membershipCtaShownThisSession;
}

export function markSuccessWasPenalty(penaltyApplied: number): void {
  lastSuccessWasPenalty = penaltyApplied > 0;
}

export function wasLastSuccessPenalty(): boolean {
  return lastSuccessWasPenalty;
}

export function markAppReviewPromptAttemptedThisSession(): void {
  promptAttemptedThisSession = true;
}

export function wasAppReviewPromptAttemptedThisSession(): boolean {
  return promptAttemptedThisSession;
}

/** Test-only reset. */
export function resetAppReviewSessionFlags(): void {
  membershipCtaShownThisSession = false;
  lastSuccessWasPenalty = false;
  promptAttemptedThisSession = false;
}
