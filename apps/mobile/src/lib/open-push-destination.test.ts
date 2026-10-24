import { hrefForPushData, isNavigablePushData } from './open-push-destination';

describe('hrefForPushData', () => {
  it('opens Today for a habit slot', () => {
    expect(hrefForPushData({ destination: 'today' })).toBe('/(tabs)');
  });

  it('ignores engagementDeliveryId when choosing a destination', () => {
    expect(
      hrefForPushData({
        destination: 'today',
        engagementDeliveryId: 'delivery-1',
      }),
    ).toBe('/(tabs)');
    expect(
      hrefForPushData({
        destination: 'challenge',
        challengeId: 'c1',
        engagementDeliveryId: 'delivery-1',
      }),
    ).toEqual({ pathname: '/(tabs)', params: { focus: 'c1' } });
  });

  it('opens Today on the card of the challenge a reminder names', () => {
    const onCard = { pathname: '/(tabs)', params: { focus: 'c1' } };
    expect(hrefForPushData({ destination: 'challenge', challengeId: 'c1' })).toEqual(onCard);
    expect(hrefForPushData({ challengeId: 'c1' })).toEqual(onCard);
    expect(hrefForPushData({ destination: 'today', challengeId: 'c1' })).toEqual(onCard);
  });

  it('opens Challenges from an admin broadcast', () => {
    expect(hrefForPushData({ destination: 'challenges' })).toBe('/(tabs)/challenges');
  });

  it('opens the match board when the payload names the match', () => {
    expect(hrefForPushData({ matchId: 'm1' })).toBe('/matches/m1');
  });

  it('opens the completion screen from a success payload', () => {
    expect(
      hrefForPushData({
        userChallengeId: 'uc1',
        title: '20 push-ups',
        points: '20',
        streak: '3',
        count: '24',
        target: '20',
        metric: 'pushups',
      }),
    ).toEqual({
      pathname: '/challenge/success',
      params: {
        userChallengeId: 'uc1',
        title: '20 push-ups',
        points: '20',
        streak: '3',
        count: '24',
        target: '20',
        metric: 'pushups',
      },
    });
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

  it('is true for match, challenge, today, and completion destinations', () => {
    expect(isNavigablePushData({ matchId: 'm1' })).toBe(true);
    expect(isNavigablePushData({ destination: 'challenge', challengeId: 'c1' })).toBe(true);
    expect(isNavigablePushData({ destination: 'today' })).toBe(true);
    expect(isNavigablePushData({ destination: 'challenges' })).toBe(true);
    expect(isNavigablePushData({ userChallengeId: 'uc1' })).toBe(true);
  });
});
