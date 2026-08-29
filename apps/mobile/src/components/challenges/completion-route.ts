import type { ChallengeCompletionKind, UserChallengeStatus } from '@product/client';

export function completionRoute(challenge: {
  challengeId: string;
  status: UserChallengeStatus;
  completionKind: ChallengeCompletionKind;
}): `/challenge/${string}/log` | null {
  if (
    challenge.status === 'in_progress' &&
    challenge.completionKind === 'vitals_bp'
  ) {
    return `/challenge/${challenge.challengeId}/log`;
  }

  return null;
}
