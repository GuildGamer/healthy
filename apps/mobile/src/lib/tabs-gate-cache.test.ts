import {
  clearCachedTabsGate,
  getCachedTabsGate,
  resetTabsGateCacheForTests,
  setCachedTabsGate,
} from './tabs-gate-cache';

describe('tabs-gate-cache', () => {
  beforeEach(() => {
    resetTabsGateCacheForTests();
  });

  it('returns null when empty or for another user', () => {
    expect(getCachedTabsGate('user-a')).toBeNull();
    setCachedTabsGate('user-a', '/(tabs)');
    expect(getCachedTabsGate('user-b')).toBeNull();
  });

  it('seeds the same href after a simulated remount', () => {
    setCachedTabsGate('user-a', '/(tabs)');
    expect(getCachedTabsGate('user-a')).toBe('/(tabs)');
  });

  it('clears on sign-out', () => {
    setCachedTabsGate('user-a', '/(tabs)');
    clearCachedTabsGate();
    expect(getCachedTabsGate('user-a')).toBeNull();
  });
});
