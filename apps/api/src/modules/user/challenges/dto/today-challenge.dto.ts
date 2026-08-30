import type {
  ChallengeCapture,
  ChallengeDraft,
  ChallengeFieldProgress,
  ChallengeHistoryEvidence,
  ChallengeHistoryLog,
  ChallengeHistoryOutcome,
} from '@product/contract';
import type {
  ChallengeCompletionKind,
  ChallengeFrequency,
  HealthCategory,
  UserChallengeStatus,
} from '@product/db';

export type SurpriseEvidenceRequestDto = {
  expiresAt: string;
  windowSeconds: number;
  penaltyPoints: number;
};

export type TodayChallengeDto = {
  id: string;
  challengeId: string;
  title: string;
  description: string;
  category: HealthCategory;
  rewardPoints: number;
  status: UserChallengeStatus;
  frequency: ChallengeFrequency;
  completionKind: ChallengeCompletionKind;
  instruction: string;
  icon: string;
  periodKey: string;
  evidenceRequest: SurpriseEvidenceRequestDto | null;
  draft: ChallengeDraft | null;
  progress: ChallengeFieldProgress;
  capture: ChallengeCapture;
};

export type ListTodayChallengesDto = {
  dayKey: string;
  challenges: TodayChallengeDto[];
  completedCount: number;
  totalCount: number;
};

export type StartChallengeDto = {
  challenge: TodayChallengeDto;
};

export type CompleteChallengeDto = {
  challenge: TodayChallengeDto;
  pointsBalance: number;
  currentStreakDays: number;
  pointsAwarded: number;
  evidenceRequest: SurpriseEvidenceRequestDto | null;
  penaltyApplied: number;
};

export type ActivityItemDto = {
  id: string;
  delta: number;
  reason: string;
  createdAt: string;
};

export type ListActivityDto = {
  items: ActivityItemDto[];
};

export type ChallengeHistoryEntryDto = {
  id: string;
  periodKey: string;
  completedAt: string;
  outcome: ChallengeHistoryOutcome;
  pointsDelta: number;
  log: ChallengeHistoryLog | null;
  evidence: ChallengeHistoryEvidence | null;
};

export type ListChallengeHistoryDto = {
  challengeId: string;
  entries: ChallengeHistoryEntryDto[];
};
