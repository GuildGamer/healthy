import type { ChallengeCapture } from '@product/contract';
import type { ChallengeCompletionKind, HealthCategory } from '@product/db';

/** A challenge enrolled automatically when its condition is picked. */
export type StarterChallengeDto = {
  challengeId: string;
  title: string;
  description: string;
  category: HealthCategory;
  isUniversal: boolean;
  completionKind: ChallengeCompletionKind;
  capture: ChallengeCapture;
};

export type StarterChallengesDto = {
  challenges: StarterChallengeDto[];
};
