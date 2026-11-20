import {
  type ActivityProofClip,
  emptyChallengeTarget,
  type ProgressShareResult,
} from '@product/contract';
import { describe, expect, it } from 'vitest';
import { buildProgressDayDetail } from './progress-day-detail.js';
import type { LedgerDetailRow } from './types/progress.js';

const mark = {
  category: 'general' as const,
  completionKind: 'check_in' as const,
  capture: { kind: 'self_report' as const, metric: null, target: emptyChallengeTarget },
};

function ledgerRow(
  id: string,
  delta: number,
  at: string,
  occurrence: {
    userChallengeId: string;
    title: string;
    share?: ProgressShareResult | null;
    proofClip?: ActivityProofClip | null;
  } | null,
): LedgerDetailRow {
  return {
    id,
    delta,
    reason: occurrence ? `Completed: ${occurrence.title}` : 'Welcome bonus',
    createdAt: new Date(at),
    occurrence: occurrence
      ? {
          ...mark,
          challengeId: `challenge-${occurrence.userChallengeId}`,
          userChallengeId: occurrence.userChallengeId,
          title: occurrence.title,
          completedAt: new Date(at),
          photoCheck: { resolution: 'expired', windowSeconds: 600 },
          share: occurrence.share ?? null,
          proofClip: occurrence.proofClip ?? null,
        }
      : null,
  };
}

describe('buildProgressDayDetail', () => {
  it('splits a day into done, missed photo checks and adjustments', () => {
    const detail = buildProgressDayDetail({
      dayKey: '2026-10-20',
      dailyOccurrences: [],
      practice: [],
      ledger: [
        ledgerRow('l1', 150, '2026-10-20T08:30:00.000Z', {
          userChallengeId: 'water',
          title: 'Log your water',
        }),
        ledgerRow('l2', -100, '2026-10-20T18:40:00.000Z', {
          userChallengeId: 'gym',
          title: 'Gym session',
        }),
        ledgerRow('l3', 50, '2026-10-20T12:00:00.000Z', null),
      ],
    });

    expect(detail.pointsEarned).toBe(200);
    expect(detail.pointsLost).toBe(100);
    expect(detail.done).toMatchObject([
      { userChallengeId: 'water', title: 'Log your water', points: 150 },
    ]);
    expect(detail.missedPhotoChecks).toMatchObject([
      { userChallengeId: 'gym', resolution: 'expired', windowSeconds: 600, pointsLost: 100 },
    ]);
    expect(detail.adjustments).toMatchObject([{ reason: 'Welcome bonus', points: 50 }]);
  });

  it('lists what was done in the order it was done', () => {
    const detail = buildProgressDayDetail({
      dayKey: '2026-10-20',
      dailyOccurrences: [],
      practice: [],
      ledger: [
        ledgerRow('late', 150, '2026-10-20T18:00:00.000Z', {
          userChallengeId: 'walk',
          title: 'Walk',
        }),
        ledgerRow('early', 150, '2026-10-20T07:00:00.000Z', {
          userChallengeId: 'water',
          title: 'Water',
        }),
      ],
    });

    expect(detail.done.map((item) => item.title)).toEqual(['Water', 'Walk']);
  });

  it('copies a shareable result and keeps a reading off the row', () => {
    const detail = buildProgressDayDetail({
      dayKey: '2026-10-20',
      dailyOccurrences: [],
      practice: [],
      ledger: [
        ledgerRow('water', 150, '2026-10-20T08:00:00.000Z', {
          userChallengeId: 'water',
          title: 'Log your water',
          share: { kind: 'glasses', count: 6 },
        }),
        ledgerRow('reading', 150, '2026-10-20T09:00:00.000Z', {
          userChallengeId: 'pressure',
          title: 'Check your blood pressure',
          share: null,
        }),
      ],
    });

    expect(detail.done.map((item) => item.share)).toEqual([{ kind: 'glasses', count: 6 }, null]);
    expect(JSON.stringify(detail)).not.toContain('128');
  });

  it('carries the clip that filmed a finished challenge and a practice set', () => {
    const clip: ActivityProofClip = {
      id: 'clip-1',
      displayCode: 'H7K-29Q',
      status: 'ready',
      audience: 'anyone',
      isPostedToGroup: true,
    };
    const detail = buildProgressDayDetail({
      dayKey: '2026-10-20',
      dailyOccurrences: [],
      ledger: [
        ledgerRow('pushups', 150, '2026-10-20T08:00:00.000Z', {
          userChallengeId: 'pushups',
          title: 'Do 20 pushups',
          proofClip: clip,
        }),
      ],
      practice: [
        {
          id: 'set-1',
          metric: 'pushups',
          count: 12,
          durationSeconds: 40,
          createdAt: new Date('2026-10-20T09:00:00.000Z'),
          proofClip: { ...clip, id: 'clip-2', audience: null, isPostedToGroup: false },
        },
      ],
    });

    expect(detail.done[0]?.proofClip).toEqual(clip);
    expect(detail.practice[0]?.proofClip).toMatchObject({
      id: 'clip-2',
      audience: null,
      isPostedToGroup: false,
    });
  });

  it('counts due and done daily challenges from the occurrences', () => {
    const detail = buildProgressDayDetail({
      dayKey: '2026-10-20',
      ledger: [],
      practice: [],
      dailyOccurrences: [
        { ...mark, challengeId: 'a', dayKey: '2026-10-20', isRewarded: true },
        { ...mark, challengeId: 'b', dayKey: '2026-10-20', isRewarded: false },
      ],
    });

    expect(detail.dailyDoneCount).toBe(1);
    expect(detail.dailyDueCount).toBe(2);
  });
});
