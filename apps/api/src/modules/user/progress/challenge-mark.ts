import {
  displayChallengeTitle,
  resolveEnrollmentTargetCount,
  resolveEnrollmentTargetDuration,
  toChallengeCapture,
} from '@product/contract';
import type { Prisma, SurpriseEvidenceStatus } from '@product/db';
import type {
  CHALLENGE_MARK_SELECT,
  ENROLLMENT_GOAL_SELECT,
} from './constants/challenge-mark-select.js';
import type { ChallengeMark, PhotoCheckOutcome } from './types/progress.js';

type MarkedOccurrence = {
  challengeId: string;
  enrollment: Prisma.ChallengeEnrollmentGetPayload<{
    select: typeof ENROLLMENT_GOAL_SELECT;
  }> | null;
  challenge: Prisma.ChallengeGetPayload<{ select: typeof CHALLENGE_MARK_SELECT }>;
};

export function challengeMarkFor(occurrence: MarkedOccurrence): ChallengeMark {
  const { challenge, enrollment } = occurrence;

  return {
    challengeId: occurrence.challengeId,
    category: challenge.category,
    completionKind: challenge.completionKind,
    capture: toChallengeCapture({
      ...challenge,
      targetCount: resolveEnrollmentTargetCount(challenge.targetCount, enrollment?.targetCount),
      targetDurationMinutes: resolveEnrollmentTargetDuration(
        challenge.targetDurationMinutes,
        enrollment?.targetDurationMinutes,
      ),
    }),
  };
}

/** Only a skip or a timeout ever takes points, so anything not skipped ran out. */
export function photoCheckOutcomeFor(occurrence: {
  challenge: { surpriseEvidenceWindowSeconds: number };
  surpriseEvidenceRequest: { status: SurpriseEvidenceStatus; windowSeconds: number } | null;
}): PhotoCheckOutcome {
  const request = occurrence.surpriseEvidenceRequest;

  return {
    resolution: request?.status === 'skipped' ? 'skipped' : 'expired',
    windowSeconds: request?.windowSeconds ?? occurrence.challenge.surpriseEvidenceWindowSeconds,
  };
}

/** The name the member knows it by: their own push-up target, not the catalog's. */
export function challengeTitleFor(occurrence: MarkedOccurrence): string {
  return displayChallengeTitle({
    title: occurrence.challenge.title,
    metric: occurrence.challenge.deviceMetric,
    count: resolveEnrollmentTargetCount(
      occurrence.challenge.targetCount,
      occurrence.enrollment?.targetCount,
    ),
  });
}
