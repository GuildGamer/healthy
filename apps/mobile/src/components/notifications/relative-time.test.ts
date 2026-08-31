import { formatRelativeTime } from './relative-time';

const now = new Date('2026-08-29T12:00:00.000Z');

describe('formatRelativeTime', () => {
  it('labels the last minute as just now', () => {
    expect(formatRelativeTime('2026-08-29T11:59:40.000Z', now)).toBe('Just now');
  });

  it('uses minutes, hours and days as the gap grows', () => {
    expect(formatRelativeTime('2026-08-29T11:45:00.000Z', now)).toBe('15m ago');
    expect(formatRelativeTime('2026-08-29T09:00:00.000Z', now)).toBe('3h ago');
    expect(formatRelativeTime('2026-08-27T12:00:00.000Z', now)).toBe('2d ago');
  });
});
