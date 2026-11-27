import { isDeviceCapture, type ChallengeCaptureKind } from './challenge-capture.js';
import type { ChallengeCompletionKind } from './catalog-fields.js';

export type ChallengeSpecInput = {
  completionKind: ChallengeCompletionKind;
  captureKind: ChallengeCaptureKind;
  deviceMetric: string | null;
  targetDurationMinutes: number | null;
  targetDistanceMeters: number | null;
  targetCount: number | null;
};

export function challengeSpecIssue(input: ChallengeSpecInput): string | null {
  if (input.completionKind === 'evidence_photo' && input.captureKind !== 'photo') {
    return 'A gym-photo challenge must use photo capture.';
  }

  if (input.captureKind === 'photo' && input.completionKind !== 'evidence_photo') {
    return 'Photo capture is only valid for evidence_photo challenges.';
  }

  if (isDeviceCapture(input.captureKind) && !input.deviceMetric) {
    return 'Device capture needs a metric.';
  }

  if (!isDeviceCapture(input.captureKind) && input.deviceMetric) {
    return 'Only device capture kinds may set a metric.';
  }

  if (input.completionKind === 'water') {
    return input.targetDurationMinutes || input.targetDistanceMeters
      ? 'A water challenge counts glasses, so it takes only a target count.'
      : null;
  }

  if (
    !isDeviceCapture(input.captureKind) &&
    (input.targetDurationMinutes || input.targetDistanceMeters || input.targetCount)
  ) {
    return 'Targets are only valid on device and water challenges.';
  }

  if (input.deviceMetric === 'pushups') {
    if (input.captureKind !== 'device_session') {
      return 'Push-up challenges must use a device session.';
    }

    if (!input.targetCount) {
      return 'Push-up challenges need a target count.';
    }
  }

  return null;
}
