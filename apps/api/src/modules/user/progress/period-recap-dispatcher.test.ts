import { describe, expect, it } from 'vitest';
import { PeriodRecapDispatcherService } from './period-recap-dispatcher.service.js';

describe('PeriodRecapDispatcherService.dueRecaps', () => {
  const service = new PeriodRecapDispatcherService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  it('queues last week on a Monday', () => {
    expect(service.dueRecaps('UTC', new Date('2026-10-26T10:00:00.000Z'))).toEqual([
      { period: 'week', periodKey: '2026-10-19' },
    ]);
  });

  it('queues last month on the first', () => {
    expect(service.dueRecaps('UTC', new Date('2026-11-01T10:00:00.000Z'))).toEqual([
      { period: 'month', periodKey: '2026-10-01' },
    ]);
  });

  it('queues last year on New Year’s Day', () => {
    expect(service.dueRecaps('UTC', new Date('2027-01-01T10:00:00.000Z'))).toContainEqual({
      period: 'year',
      periodKey: '2026-01-01',
    });
  });

  it('stays quiet mid-week', () => {
    expect(service.dueRecaps('UTC', new Date('2026-10-22T10:00:00.000Z'))).toEqual([]);
  });
});
