import type {
  ChallengeCompletionKind,
  ChallengeFrequency,
  HealthCategory,
} from '@product/db';
import type { ChallengeReminderDto } from '../../reminders/dto/challenge-reminder.dto.js';

/** A catalog challenge paired with this user's opt-in state for it. */
export type CatalogChallengeDto = {
  challengeId: string;
  slug: string;
  title: string;
  description: string;
  category: HealthCategory;
  rewardPoints: number;
  /** The cadence that would apply, whether enrolled or not. */
  frequency: ChallengeFrequency;
  completionKind: ChallengeCompletionKind;
  instruction: string;
  icon: string;
  isEnrolled: boolean;
  /** Empty unless enrolled; the times this challenge nudges at. */
  reminders: ChallengeReminderDto[];
};

export type ChallengeCatalogDto = {
  challenges: CatalogChallengeDto[];
  enrolledCount: number;
};
