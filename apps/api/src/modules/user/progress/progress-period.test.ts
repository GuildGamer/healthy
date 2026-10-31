import { describe, expect, it, vi } from 'vitest';
import { ProgressService } from './progress.service.js';

const user = { id: 'u1', email: 'a@b.c', name: 'Ada' };

function createPrisma(activity: unknown[] = [], occurrences: unknown[] = []) {
  return {
    userProfile: {
      findUnique: vi.fn(async () => ({ timeZone: 'UTC' })),
    },
    user: {
      findUnique: vi.fn(async () => ({ createdAt: new Date('2026-07-01T00:00:00.000Z') })),
    },
    userChallenge: {
      findMany: vi.fn(async () => occurrences),
    },
    deviceActivityLog: {
      findMany: vi.fn(async () => activity),
    },
    pointLedgerEntry: { findMany: vi.fn(async () => []) },
  };
}

describe('ProgressService.periodReport', () => {
  it('counts rewarded days and picks the strongest metric', async () => {
    const prisma = createPrisma(
      [
        {
          metric: 'pushups',
          count: 40,
          durationSeconds: 60,
          createdAt: new Date('2026-10-20T12:00:00.000Z'),
        },
        {
          metric: 'pushups',
          count: 20,
          durationSeconds: 40,
          createdAt: new Date('2026-10-21T12:00:00.000Z'),
        },
        {
          metric: 'walk',
          count: null,
          durationSeconds: 600,
          createdAt: new Date('2026-10-21T14:00:00.000Z'),
        },
      ],
      [
        {
          challengeId: 'c1',
          periodKey: '2026-10-20',
          status: 'completed',
          completionOutcome: 'completed',
          enrollment: null,
          challenge: {
            id: 'c1',
            title: 'Push-ups',
            category: 'general',
            completionKind: 'device_session',
            captureKind: 'device_session',
            captureMetric: 'pushups',
            sortOrder: 1,
          },
        },
        {
          challengeId: 'c1',
          periodKey: '2026-10-21',
          status: 'completed',
          completionOutcome: 'completed',
          enrollment: null,
          challenge: {
            id: 'c1',
            title: 'Push-ups',
            category: 'general',
            completionKind: 'device_session',
            captureKind: 'device_session',
            captureMetric: 'pushups',
            sortOrder: 1,
          },
        },
      ],
    );

    const service = new ProgressService(prisma as never);
    const report = await service.periodReport(
      user,
      'week',
      new Date('2026-10-22T12:00:00.000Z'),
    );

    expect(report.activeDays).toBe(2);
    expect(report.highlight).toEqual({
      metric: 'pushups',
      count: 60,
      unit: 'push-ups',
    });
    expect(report.period).toBe('week');
  });

  it('counts a day that only logged a set, with no rewarded challenge', async () => {
    const prisma = createPrisma(
      [
        {
          metric: 'pushups',
          count: 12,
          durationSeconds: 40,
          createdAt: new Date('2026-10-21T12:00:00.000Z'),
        },
      ],
      [],
    );

    const service = new ProgressService(prisma as never);
    const report = await service.periodReport(
      user,
      'week',
      new Date('2026-10-22T12:00:00.000Z'),
    );

    expect(report.activeDays).toBe(1);
    expect(report.highlight).toEqual({
      metric: 'pushups',
      count: 12,
      unit: 'push-ups',
    });
  });
});

describe('ProgressService.metricPeriodStats', () => {
  it('sums push-up reps in the week', async () => {
    const prisma = createPrisma([
      {
        metric: 'pushups',
        count: 40,
        durationSeconds: 60,
        createdAt: new Date('2026-10-20T12:00:00.000Z'),
      },
      {
        metric: 'pushups',
        count: 20,
        durationSeconds: 40,
        createdAt: new Date('2026-10-21T12:00:00.000Z'),
      },
    ]);

    const service = new ProgressService(prisma as never);
    const stats = await service.metricPeriodStats(
      user,
      'pushups',
      'week',
      new Date('2026-10-22T12:00:00.000Z'),
    );

    expect(stats.count).toBe(60);
    expect(stats.activeDays).toBe(2);
    expect(stats.windowDays).toBe(4);
    expect(stats.avgPerDay).toBe(15);
    expect(stats.bestDay).toEqual({ dayKey: '2026-10-20', count: 40 });
    expect(stats.unit).toBe('push-ups');
    expect(stats.periodLabel).toBe('Oct 19–22');
  });
});
