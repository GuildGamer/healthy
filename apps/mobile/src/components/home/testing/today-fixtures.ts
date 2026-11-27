import type {
  MatchListItem,
  MatchStanding,
  TodayChallenge,
  TodayDetails,
  TodayOccurrenceDetail,
} from '@product/client';

export function todayChallenge(overrides: Partial<TodayChallenge>): TodayChallenge {
  return {
    id: 'uc1',
    challengeId: 'c1',
    title: 'Walk 20 minutes',
    description: 'A brisk walk after lunch.',
    category: 'general',
    rewardPoints: 20,
    sortOrder: 100,
    status: 'pending',
    frequency: 'daily',
    completionKind: 'check_in',
    instruction: 'A brisk walk after lunch.',
    icon: 'walk',
    periodKey: '2026-08-28',
    evidenceRequest: null,
    draft: null,
    progress: { filled: 0, required: 1 },
    capture: {
      kind: 'self_report',
      metric: null,
      target: { durationMinutes: null, distanceMeters: null, count: null },
    },
    ...overrides,
  };
}

export function liveGroup(overrides: Partial<MatchListItem> = {}): MatchListItem {
  return {
    id: 'm1',
    title: 'Push-ups with Jess and Sam',
    metric: 'pushups',
    scoringMode: 'best_single',
    dailyScope: 'any_challenge',
    endsAt: '2099-09-05T21:00:00.000Z',
    status: 'open',
    participantCount: 3,
    yourScore: 14,
    yourBestCount: 14,
    yourRank: 2,
    roster: [
      groupStanding({ userId: 'jess', displayName: 'Jess', rank: 1, score: 20 }),
      groupStanding({ userId: 'u1', displayName: 'Ada', rank: 2, score: 14, isYou: true }),
      groupStanding({ userId: 'sam', displayName: 'Sam', rank: 3, score: 0 }),
    ],
    lastMove: null,
    ...overrides,
  };
}

export function groupStanding(
  overrides: Partial<MatchStanding> & { userId: string },
): MatchStanding {
  return {
    displayName: overrides.userId,
    image: null,
    rank: 1,
    score: 0,
    bestCount: overrides.score ?? 0,
    isYou: false,
    isHost: false,
    isPending: false,
    ...overrides,
  };
}

export function todayDetails(
  occurrences: TodayOccurrenceDetail[],
  overrides: Partial<TodayDetails> = {},
): TodayDetails {
  return { dayKey: '2026-08-28', weekStartKey: '2026-08-24', occurrences, ...overrides };
}

export function occurrenceDetail(
  overrides: Partial<TodayOccurrenceDetail> & { userChallengeId: string },
): TodayOccurrenceDetail {
  return {
    lastCompletedDayKey: null,
    bestMeasuredInPeriod: null,
    activeDayKeys: [],
    completedAt: null,
    ...overrides,
  };
}
