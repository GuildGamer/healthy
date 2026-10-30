import { localActiveDayKey, userActiveStorageKey } from './user-active-day';

const SECURE_STORE_KEY = /^[A-Za-z0-9._-]+$/;

describe('user-active-day', () => {
  it('formats the local calendar day', () => {
    expect(localActiveDayKey(new Date(2026, 9, 24, 15, 0, 0))).toBe('2026-10-24');
  });

  it('builds a SecureStore-safe key', () => {
    const key = userActiveStorageKey('2026-10-24');
    expect(key).toBe('user_active_day_2026-10-24');
    expect(key).toMatch(SECURE_STORE_KEY);
  });
});
