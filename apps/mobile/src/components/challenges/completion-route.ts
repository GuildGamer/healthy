import type {
  ChallengeCaptureKind,
  ChallengeCompletionKind,
  UserChallengeStatus,
} from '@product/client';

const LOG_KINDS = new Set<ChallengeCompletionKind>([
  'vitals_bp',
  'glucose',
  'peak_flow',
  'water',
  'carbs',
]);

export function completionRoute(challenge: {
  challengeId: string;
  status: UserChallengeStatus;
  completionKind: ChallengeCompletionKind;
  capture?: { kind: ChallengeCaptureKind };
}):
  | `/challenge/${string}/log`
  | `/challenge/${string}/evidence`
  | `/challenge/${string}/verify`
  | `/challenge/${string}/confirm`
  | `/challenge/${string}/session`
  | null {
  if (challenge.status === 'completed') {
    return null;
  }

  if (challenge.status === 'awaiting_evidence') {
    return `/challenge/${challenge.challengeId}/verify`;
  }

  if (
    challenge.capture?.kind === 'device_session' ||
    challenge.capture?.kind === 'device_sample'
  ) {
    return `/challenge/${challenge.challengeId}/session`;
  }

  if (challenge.completionKind === 'check_in') {
    return `/challenge/${challenge.challengeId}/confirm`;
  }

  if (LOG_KINDS.has(challenge.completionKind)) {
    return `/challenge/${challenge.challengeId}/log`;
  }

  if (challenge.completionKind === 'evidence_photo') {
    return `/challenge/${challenge.challengeId}/evidence`;
  }

  return null;
}
