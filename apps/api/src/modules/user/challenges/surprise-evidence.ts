import { ORPCError } from '@orpc/server';
import { isDeviceCapture, type ChallengeCaptureKind } from '@product/contract';
import type { ChallengeCompletionKind } from '@product/db';
import type { ChallengeEvidenceInput } from './evidence.js';

export function canRequestSurpriseEvidence(
  completionKind: ChallengeCompletionKind,
  captureKind?: ChallengeCaptureKind,
): boolean {
  if (captureKind && isDeviceCapture(captureKind)) {
    return false;
  }

  return completionKind === 'check_in' || completionKind === 'vitals_bp';
}

export function shouldRequestSurpriseEvidence(input: {
  completionKind: ChallengeCompletionKind;
  captureKind?: ChallengeCaptureKind;
  chancePercent: number;
  unitSample: number;
}): boolean {
  if (!canRequestSurpriseEvidence(input.completionKind, input.captureKind)) {
    return false;
  }

  if (input.chancePercent <= 0) {
    return false;
  }

  if (input.chancePercent >= 100) {
    return true;
  }

  return input.unitSample * 100 < input.chancePercent;
}

export function surprisePhotoExpectation(input: {
  completionKind: ChallengeCompletionKind;
  title: string;
  instruction: string;
}): string {
  if (input.completionKind === 'vitals_bp') {
    return [
      'Decide if this photo shows a blood-pressure monitor or a device screen with a reading.',
      'Reject empty rooms, memes, and unrelated selfies.',
    ].join(' ');
  }

  return [
    `Decide if this photo reasonably shows the member doing: ${input.title}.`,
    input.instruction,
    'Reject screenshots, memes, and unrelated photos.',
  ]
    .filter((part) => part.trim().length > 0)
    .join(' ');
}

export function requireSurprisePhoto(
  evidence: ChallengeEvidenceInput | undefined,
): ChallengeEvidenceInput {
  if (!evidence) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Take a photo to finish this check',
    });
  }

  return evidence;
}

export function clampedPenalty(balance: number, penaltyPoints: number): number {
  if (penaltyPoints <= 0 || balance <= 0) {
    return 0;
  }

  return Math.min(penaltyPoints, balance);
}
