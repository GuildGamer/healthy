import type {
  ChallengeCaptureKind,
  ChallengeCompletionKind,
  UserChallengeStatus,
} from '@product/client';

export function primaryActionLabel(occurrence: {
  status: UserChallengeStatus;
  completionKind: ChallengeCompletionKind;
  capture?: { kind: ChallengeCaptureKind; metric?: string | null };
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

  const isPushups = occurrence.capture?.metric === 'pushups';
  const isDevice =
    occurrence.capture?.kind === 'device_session' ||
    occurrence.capture?.kind === 'device_sample';

  if (occurrence.status === 'in_progress') {
    if (isPushups) {
      return 'Resume';
    }

    if (isDevice) {
      return 'Resume';
    }

    if (occurrence.completionKind === 'vitals_bp') {
      return 'Resume log';
    }

    if (occurrence.completionKind === 'evidence_photo') {
      return 'Take selfie';
    }

    if (occurrence.completionKind === 'check_in') {
      return 'Confirm';
    }

    return 'Resume log';
  }

  if (isPushups) {
    return 'Start push-ups';
  }

  if (occurrence.capture?.kind === 'device_session') {
    return 'Start';
  }

  if (occurrence.completionKind === 'check_in') {
    return 'Log';
  }

  if (occurrence.completionKind === 'evidence_photo') {
    return 'Take selfie';
  }

  return 'Log';
}
