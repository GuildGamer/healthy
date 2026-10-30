import { screenPatternFromPath } from './screen-pattern';

describe('screenPatternFromPath', () => {
  it('keeps static routes', () => {
    expect(screenPatternFromPath('/(tabs)/challenges')).toBe('(tabs)/challenges');
    expect(screenPatternFromPath('/settings')).toBe('settings');
  });

  it('masks match and challenge ids', () => {
    expect(screenPatternFromPath('/matches/cm1234567890abcdef')).toBe(
      'matches/[matchId]',
    );
    expect(screenPatternFromPath('/challenge/cm1234567890abcdef/pose')).toBe(
      'challenge/[challengeId]/pose',
    );
  });

  it('masks invite tokens', () => {
    expect(screenPatternFromPath('/match/INVITETOKEN12')).toBe('match/[matchId]');
  });
});
