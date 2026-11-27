import {
  applyTabsGateResolve,
  clearCachedTabsGate,
  isTabsGateAllowed,
  markTabsGateAllowed,
  resetTabsGateCacheForTests,
} from './tabs-gate-cache';

describe('tabs-gate-cache', () => {
  beforeEach(() => {
    resetTabsGateCacheForTests();
  });

  it('is false when empty or for another user', () => {
    expect(isTabsGateAllowed('user-a')).toBe(false);
    markTabsGateAllowed('user-a');
    expect(isTabsGateAllowed('user-b')).toBe(false);
    expect(isTabsGateAllowed('user-a')).toBe(true);
  });

  it('survives a simulated remount for the same user', () => {
    markTabsGateAllowed('user-a');
    expect(isTabsGateAllowed('user-a')).toBe(true);
  });

  it('clears on sign-out', () => {
    markTabsGateAllowed('user-a');
    clearCachedTabsGate();
    expect(isTabsGateAllowed('user-a')).toBe(false);
  });

  it('marks allowed only for /(tabs), not invite or onboarding', () => {
    expect(applyTabsGateResolve('user-a', '/match/invite_tok1')).toEqual({
      markAllowed: false,
    });
    expect(isTabsGateAllowed('user-a')).toBe(false);

    expect(applyTabsGateResolve('user-a', '/complete-country')).toEqual({
      markAllowed: false,
    });
    expect(isTabsGateAllowed('user-a')).toBe(false);

    expect(applyTabsGateResolve('user-a', '/(tabs)')).toEqual({
      markAllowed: true,
    });
    expect(isTabsGateAllowed('user-a')).toBe(true);
  });
});
