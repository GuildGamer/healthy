import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../../../shared/types/authenticated-user.js';
import { ActivityRunService } from './activity-run.service.js';

const user = { id: 'u1' } as AuthenticatedUser;

type FinishRow = {
  challengeId: string;
  periodKey: string;
  frequency: 'daily' | 'weekly';
  status: 'completed' | 'pending';
  completionOutcome: 'rewarded' | 'penalized' | null;
};

const gymFinish: FinishRow = {
  challengeId: 'gym',
  periodKey: '2026-11-25',
  frequency: 'daily',
  status: 'completed',
  completionOutcome: 'rewarded',
};

function createService(input: { finish: FinishRow | null; finishedDays?: string[] }) {
  const findMany = vi
    .fn()
    .mockResolvedValue((input.finishedDays ?? []).map((periodKey) => ({ periodKey })));
  const findFirst = vi.fn().mockResolvedValue(input.finish);
  const service = new ActivityRunService({ userChallenge: { findFirst, findMany } } as never);

  return { service, findFirst, findMany };
}

describe('ActivityRunService.getActivityRun', () => {
  it('counts the days this challenge was finished in a row, ending on this finish', async () => {
    const { service } = createService({
      finish: gymFinish,
      finishedDays: ['2026-11-25', '2026-11-24', '2026-11-22'],
    });

    await expect(service.getActivityRun(user, 'uc1')).resolves.toEqual({ runDays: 2 });
  });

  it('reads only this member’s finishes of this one challenge, up to this finish', async () => {
    const { service, findMany } = createService({
      finish: gymFinish,
      finishedDays: ['2026-11-25'],
    });

    await service.getActivityRun(user, 'uc1');

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'u1',
          challengeId: 'gym',
          frequency: 'daily',
          status: 'completed',
          periodKey: { lte: '2026-11-25' },
          OR: [{ completionOutcome: null }, { completionOutcome: 'rewarded' }],
        }),
      }),
    );
  });

  it('measures a past finish as of its own day, not today', async () => {
    const { service } = createService({
      finish: { ...gymFinish, periodKey: '2026-11-10' },
      finishedDays: ['2026-11-10', '2026-11-09', '2026-11-08', '2026-11-07'],
    });

    await expect(service.getActivityRun(user, 'uc-old')).resolves.toEqual({ runDays: 4 });
  });

  it('is zero for another member’s or a missing finish', async () => {
    const { service, findMany } = createService({ finish: null });

    await expect(service.getActivityRun(user, 'uc-other')).resolves.toEqual({ runDays: 0 });
    expect(findMany).not.toHaveBeenCalled();
  });

  it.each([
    ['not finished', { ...gymFinish, status: 'pending' as const }],
    ['a weekly', { ...gymFinish, frequency: 'weekly' as const }],
    ['penalised', { ...gymFinish, completionOutcome: 'penalized' as const }],
  ])('is zero for a finish that is %s', async (_label, finish) => {
    const { service, findMany } = createService({ finish });

    await expect(service.getActivityRun(user, 'uc1')).resolves.toEqual({ runDays: 0 });
    expect(findMany).not.toHaveBeenCalled();
  });

  it('is zero when the finish itself is missing from the read days', async () => {
    const { service } = createService({ finish: gymFinish, finishedDays: ['2026-11-24'] });

    await expect(service.getActivityRun(user, 'uc1')).resolves.toEqual({ runDays: 0 });
  });

  it('refuses a signed-out caller', async () => {
    const { service } = createService({ finish: gymFinish });

    await expect(service.getActivityRun(null, 'uc1')).rejects.toBeDefined();
  });
});
