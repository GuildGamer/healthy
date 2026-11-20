import { walkOfferNotificationCopy } from '@/lib/walk-offer-copy';
import {
  walkOfferDataFromNotification,
  walkOfferSessionHref,
} from '@/lib/walk-offer-notifications';

describe('walkOfferNotificationCopy', () => {
  it('names the minute goal', () => {
    expect(walkOfferNotificationCopy(10)).toEqual({
      title: 'Are you taking your 10 minute walk?',
      body: "Let's keep count.",
    });
  });

  it('singularises a one-minute goal', () => {
    expect(walkOfferNotificationCopy(1)).toEqual({
      title: 'Are you taking your 1 minute walk?',
      body: "Let's keep count.",
    });
  });
});

describe('walkOfferDataFromNotification', () => {
  it('accepts a walk_offer payload', () => {
    expect(
      walkOfferDataFromNotification({
        kind: 'walk_offer',
        challengeId: 'c-walk',
        userChallengeId: 'uc-walk',
        dayKey: '2026-10-30',
        targetDurationMinutes: 10,
      }),
    ).toEqual({
      kind: 'walk_offer',
      challengeId: 'c-walk',
      userChallengeId: 'uc-walk',
      dayKey: '2026-10-30',
      targetDurationMinutes: 10,
    });
  });

  it('rejects unrelated payloads', () => {
    expect(walkOfferDataFromNotification({ matchId: 'm1' })).toBeNull();
    expect(walkOfferDataFromNotification(null)).toBeNull();
  });
});

describe('walkOfferSessionHref', () => {
  it('opens the session with autoStart', () => {
    expect(walkOfferSessionHref('c-walk')).toBe('/challenge/c-walk/session?autoStart=1');
  });
});
