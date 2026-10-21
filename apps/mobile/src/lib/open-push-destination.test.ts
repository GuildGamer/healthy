import { hrefForPushData, isNavigablePushData } from './open-push-destination';

describe('hrefForPushData', () => {
  it('opens Today for a habit slot', () => {
    expect(hrefForPushData({ destination: 'today' })).toBe('/(tabs)');
  });

  it('opens the challenge when the payload names one', () => {
    expect(
      hrefForPushData({ destination: 'challenge', challengeId: 'c1' }),
    ).toBe('/challenge/c1');
  });

  it('opens Challenges from an admin broadcast', () => {
    expect(hrefForPushData({ destination: 'challenges' })).toBe(
      '/(tabs)/challenges',
    );
  });

  it('opens the match board when the payload names the match', () => {
    expect(hrefForPushData({ matchId: 'm1' })).toBe('/matches/m1');
  });

  it('stays on home when the payload is empty', () => {
    expect(hrefForPushData(null)).toBe('/(tabs)');
  });
});

describe('isNavigablePushData', () => {
  it('is false for null or empty payloads', () => {
    expect(isNavigablePushData(null)).toBe(false);
    expect(isNavigablePushData({})).toBe(false);
  });

  it('is true for match, challenge, and today destinations', () => {
    expect(isNavigablePushData({ matchId: 'm1' })).toBe(true);
    expect(
      isNavigablePushData({ destination: 'challenge', challengeId: 'c1' }),
    ).toBe(true);
    expect(isNavigablePushData({ destination: 'today' })).toBe(true);
    expect(isNavigablePushData({ destination: 'challenges' })).toBe(true);
  });
});
