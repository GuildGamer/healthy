import type {
  ChallengeCompletionKind,
  ChallengeFrequency,
  HealthCategory,
  UserChallengeStatus,
} from '@product/db';

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
