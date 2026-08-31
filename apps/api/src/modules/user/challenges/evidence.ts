import { ORPCError } from '@orpc/server';
import type { ChallengeCompletionKind } from '@product/db';

export type ChallengeEvidenceInput = {
  mimeType: 'image/jpeg' | 'image/png';
  imageBase64: string;
};

export function requireEvidenceFor(
  completionKind: ChallengeCompletionKind,
  evidence: ChallengeEvidenceInput | undefined,
): ChallengeEvidenceInput | null {
  if (completionKind !== 'evidence_photo') {
    return null;
  }

  if (!evidence) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Take a gym photo to finish this challenge',
    });
  }

  return evidence;
}
