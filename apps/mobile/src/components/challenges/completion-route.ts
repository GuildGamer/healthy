import type {
  ChallengeCaptureKind,
  ChallengeCompletionKind,
  UserChallengeStatus,
} from '@product/client';
import { canPracticeAgain, practiceRoute } from './practice-entry';

const LOG_KINDS = new Set<ChallengeCompletionKind>([
  'vitals_bp',
  'glucose',
  'peak_flow',
  'water',
  'carbs',
]);

/** Sleep stays a check_in; the sheet opens when capture says structured sleep. */
export function isSleepCapture(capture?: {
  kind?: ChallengeCaptureKind | string | null;
  metric?: string | null;
}): boolean {
  return capture?.kind === 'structured_log' && capture.metric === 'sleep';
}

export function completionRoute(challenge: {
  challengeId: string;
  status: UserChallengeStatus;
  completionKind: ChallengeCompletionKind;
  capture?: { kind: ChallengeCaptureKind; metric?: string | null };
}):
  | `/challenge/${string}/log`
  | `/challenge/${string}/evidence`
  | `/challenge/${string}/verify`
  | `/challenge/${string}/confirm`
  | `/challenge/${string}/session`
  | `/challenge/${string}/pose`
  | `/challenge/${string}/practice`
  | null {
  if (challenge.status === 'completed') {
    return canPracticeAgain(challenge) ? practiceRoute(challenge.challengeId) : null;
  }

  if (challenge.status === 'awaiting_evidence') {
    return `/challenge/${challenge.challengeId}/verify`;
  }

  if (challenge.capture?.metric === 'pushups') {
    return `/challenge/${challenge.challengeId}/pose`;
  }

  if (challenge.capture?.kind === 'device_session' || challenge.capture?.kind === 'device_sample') {
    return `/challenge/${challenge.challengeId}/session`;
  }

  if (isSleepCapture(challenge.capture)) {
    return `/challenge/${challenge.challengeId}/log`;
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
