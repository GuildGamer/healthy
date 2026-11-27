import { describe, expect, it } from 'vitest';
import { doneTodayUserIds } from './match-today.js';

const at = new Date('2026-10-22T09:00:00.000Z');

describe('doneTodayUserIds', () => {
  it('lights accepted members with an event on the day', () => {
    const done = doneTodayUserIds(
      [
        { userId: 'ada', count: 20, dayKey: '2026-10-22', occurredAt: at },
        { userId: 'bee', count: 5, dayKey: '2026-10-21', occurredAt: at },
      ],
      new Set(['ada', 'bee']),
      '2026-10-22',
    );

    expect([...done]).toEqual(['ada']);
  });

  it('never lights a pending member', () => {
    const done = doneTodayUserIds(
      [{ userId: 'cam', count: 1, dayKey: '2026-10-22', occurredAt: at }],
      new Set(['ada']),
      '2026-10-22',
    );

    expect(done.size).toBe(0);
  });
});
