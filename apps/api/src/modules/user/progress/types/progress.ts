import type {
  ChallengeCapture,
  ChallengeCompletionKind,
  DeviceMetric,
  HealthCategory,
  ProgressShareResult,
} from '@product/contract';

/** Enough of a challenge to draw its mark. Never what was logged against it. */
export type ChallengeMark = {
  challengeId: string;
  category: HealthCategory;
  completionKind: ChallengeCompletionKind;
  capture: ChallengeCapture;
};

/** A daily occurrence, reduced to what History counts. */
export type DailyOccurrence = ChallengeMark & {
  dayKey: string;
  isRewarded: boolean;
};

/** A ledger row bucketed into the member's local day. */
export type LedgerDayRow = {
  dayKey: string;
  delta: number;
  isChallengeLinked: boolean;
};

export type PhotoCheckOutcome = {
  resolution: 'expired' | 'skipped';
  windowSeconds: number;
};

/** A ledger row from one day, with the occurrence it moved points for. */
export type LedgerDetailRow = {
  id: string;
  delta: number;
  reason: string;
  createdAt: Date;
  occurrence:
    | (ChallengeMark & {
        userChallengeId: string;
        title: string;
        completedAt: Date | null;
        photoCheck: PhotoCheckOutcome;
        /** Already reduced. The raw log never sits on this row. */
        share: ProgressShareResult | null;
      })
    | null;
};

export type PracticeRow = {
  id: string;
  metric: DeviceMetric;
  count: number | null;
  durationSeconds: number | null;
  createdAt: Date;
};

/** The member's own clock: their zone, today, and the day they joined. */
export type MemberClock = {
  timeZone: string;
  dayKey: string;
  weekStartKey: string;
  joinedDayKey: string;
};
