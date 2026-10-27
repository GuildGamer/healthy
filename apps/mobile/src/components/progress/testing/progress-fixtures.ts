import type {
  ListLeaderboardOutput,
  MeOutput,
  ProgressDay,
  ProgressDayDetail,
  ProgressDays,
} from '@product/client';

const capture = {
  kind: 'self_report' as const,
  metric: null,
  target: { durationMinutes: null, distanceMeters: null, count: null },
};

export const challengeMark = {
  challengeId: 'water',
  category: 'general' as const,
  completionKind: 'water' as const,
  capture,
};

export function progressDay(dayKey: string, overrides: Partial<ProgressDay> = {}): ProgressDay {
  return {
    dayKey,
    dailyChallenges: [{ ...challengeMark, isDone: true }],
    pointsTotal: 150,
    pointsLost: 0,
    isShownUp: true,
    ...overrides,
  };
}

/** Thursday 22 October: Monday and Tuesday done, Wednesday missed, today done. */
export function progressDays(overrides: Partial<ProgressDays> = {}): ProgressDays {
  return {
    dayKey: '2026-10-22',
    weekStartKey: '2026-10-19',
    joinedDayKey: '2026-08-01',
    days: [
      progressDay('2026-10-22'),
      progressDay('2026-10-21', {
        dailyChallenges: [{ ...challengeMark, isDone: false }],
        pointsTotal: 0,
        isShownUp: false,
      }),
      progressDay('2026-10-20', { pointsTotal: 50, pointsLost: 100 }),
      progressDay('2026-10-19'),
      progressDay('2026-10-18'),
    ],
    ...overrides,
  };
}

export function dayDetail(overrides: Partial<ProgressDayDetail> = {}): ProgressDayDetail {
  return {
    dayKey: '2026-10-20',
    pointsEarned: 150,
    pointsLost: 100,
    dailyDoneCount: 1,
    dailyDueCount: 2,
    done: [
      {
        ...challengeMark,
        userChallengeId: 'uc-water',
        title: 'Log your water',
        completedAt: '2026-10-20T08:30:00.000Z',
        points: 150,
        share: null,
        proofClip: null,
      },
    ],
    missedPhotoChecks: [
      {
        ...challengeMark,
        challengeId: 'gym',
        completionKind: 'evidence_photo',
        userChallengeId: 'uc-gym',
        title: 'Gym session',
        resolution: 'expired',
        windowSeconds: 600,
        pointsLost: 100,
        at: '2026-10-20T18:40:00.000Z',
      },
    ],
    practice: [
      {
        id: 'p1',
        title: 'Push-up practice',
        metric: 'pushups',
        count: 14,
        durationSeconds: 120,
        recordedAt: '2026-10-20T19:10:00.000Z',
        proofClip: null,
      },
    ],
    adjustments: [],
    ...overrides,
  };
}

export function me(overrides: Partial<MeOutput> = {}): MeOutput {
  return {
    id: 'u1',
    email: 'ada@example.com',
    name: 'Ada Lovelace',
    categories: ['hypertension'],
    pointsBalance: 4350,
    currentStreakDays: 1,
    streakLapsedYesterday: false,
    bestStreakDays: 12,
    timeZone: 'UTC',
    countryCode: 'GB',
    displayName: 'Kind Finch',
    reminderEnabled: false,
    reminderMinute: 1140,
    evidenceRemindersEnabled: true,
    promotionalMessagesEnabled: false,
    showOnLeaderboard: true,
    inProgressNudgeEnabled: true,
    inProgressNudgeDelayMinutes: 30,
    groupNotificationsEnabled: true,
    healthLinkStatus: 'unknown',
    hasMembership: false,
    maxRemindersPerChallenge: 1,
    proofClipAudience: null,
    ...overrides,
  };
}

export function weeklyBoard(overrides: Partial<ListLeaderboardOutput> = {}): ListLeaderboardOutput {
  return {
    weekStart: '2026-10-19',
    period: 'week',
    periodStart: '2026-10-19',
    entries: [],
    currentUserRank: 38,
    currentUserRankAtDayStart: 38,
    currentUserPoints: 1750,
    currentUserVisible: true,
    aroundCurrentUser: [
      { rank: 37, displayName: 'Gentle Moth', points: 1790, isCurrentUser: false },
      { rank: 38, displayName: 'Kind Finch', points: 1750, isCurrentUser: true },
    ],
    ...overrides,
  };
}
