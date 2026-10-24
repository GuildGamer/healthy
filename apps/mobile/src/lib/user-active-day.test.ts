import {
  localActiveDayKey,
  shouldEmitUserActive,
  userActiveStorageKey,
} from './user-active-day';

describe('user-active-day', () => {
  it('formats the local calendar day', () => {
    expect(localActiveDayKey(new Date(2026, 9, 24, 15, 0, 0))).toBe('2026-10-24');
  });

  it('builds the SecureStore key', () => {
    expect(userActiveStorageKey('2026-10-24')).toBe('user_active_day:2026-10-24');
  });

  it('emits only when the stored day differs', () => {
    expect(shouldEmitUserActive(null, '2026-10-24')).toBe(true);
    expect(shouldEmitUserActive('2026-10-23', '2026-10-24')).toBe(true);
    expect(shouldEmitUserActive('2026-10-24', '2026-10-24')).toBe(false);
  });
});
