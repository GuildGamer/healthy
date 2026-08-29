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

  if (occurrence.status === 'in_progress') {
    return occurrence.completionKind === 'vitals_bp' ? 'Log reading' : 'Finish';
  }

  return 'Start now';
}
