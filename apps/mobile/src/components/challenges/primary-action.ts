import type { ChallengeCompletionKind, UserChallengeStatus } from '@product/client';

export function primaryActionLabel(occurrence: {
  status: UserChallengeStatus;
  completionKind: ChallengeCompletionKind;
} | null | undefined): string | null {
  if (!occurrence) {
    return null;
  }

  if (occurrence.status === 'completed') {
    return 'Done';
  }

  if (occurrence.status === 'awaiting_evidence') {
    return 'Submit photo';
  }

  if (occurrence.status === 'in_progress') {
    if (occurrence.completionKind === 'vitals_bp') {
      return 'Log reading';
    }

    if (occurrence.completionKind === 'evidence_photo') {
      return 'Take selfie';
    }

    return 'Finish';
  }

  return 'Start now';
}
