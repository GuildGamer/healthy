import { hrefForPushData } from './open-push-destination';

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
