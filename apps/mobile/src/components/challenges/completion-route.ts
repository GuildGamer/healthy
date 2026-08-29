import type { ChallengeCompletionKind, UserChallengeStatus } from '@product/client';

export function completionRoute(challenge: {
  challengeId: string;
  status: UserChallengeStatus;
  completionKind: ChallengeCompletionKind;
}):
  | `/challenge/${string}/log`
  | `/challenge/${string}/evidence`
  | `/challenge/${string}/verify`
  | null {
  if (challenge.status === 'awaiting_evidence') {
    return `/challenge/${challenge.challengeId}/verify`;
  }

  if (challenge.status !== 'in_progress') {
    return null;
  }

  if (challenge.completionKind === 'vitals_bp') {
    return `/challenge/${challenge.challengeId}/log`;
  }

  if (challenge.completionKind === 'evidence_photo') {
    return `/challenge/${challenge.challengeId}/evidence`;
  }

  return null;
}
