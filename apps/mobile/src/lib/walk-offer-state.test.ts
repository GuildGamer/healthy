import { walkOfferAlreadyHandled, type WalkOfferRecord } from '@/lib/walk-offer-state';

describe('walkOfferAlreadyHandled', () => {
  const record: WalkOfferRecord = {
    dayKey: '2026-10-30',
    userChallengeId: 'uc-walk',
    status: 'dismissed',
  };

  it('is false with no prior record', () => {
    expect(walkOfferAlreadyHandled(null, '2026-10-30', 'uc-walk')).toBe(false);
  });

  it('is true for the same occurrence on the same day', () => {
    expect(walkOfferAlreadyHandled(record, '2026-10-30', 'uc-walk')).toBe(true);
  });

  it('is false on a new day', () => {
    expect(walkOfferAlreadyHandled(record, '2026-10-31', 'uc-walk')).toBe(false);
  });

  it('is false for a different occurrence', () => {
    expect(walkOfferAlreadyHandled(record, '2026-10-30', 'uc-other')).toBe(false);
  });
});
