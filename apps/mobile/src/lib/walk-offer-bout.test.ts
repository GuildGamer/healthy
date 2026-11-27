import {
  accumulateWalkOfferFix,
  emptyWalkOfferBout,
  preferFurtherWalkOfferBout,
  WALK_OFFER_DISPLACEMENT_METERS,
} from '@/lib/walk-offer-bout';
import type { GeoPoint } from '@/lib/geo-session';

function fix(latitude: number, longitude: number, recordedAt: number): GeoPoint {
  return { latitude, longitude, recordedAt };
}

describe('accumulateWalkOfferFix', () => {
  it('seeds the first fix without counting time', () => {
    const next = accumulateWalkOfferFix(emptyWalkOfferBout(), fix(1, 1, 1_000));
    expect(next.movingSeconds).toBe(0);
    expect(next.lastFix?.recordedAt).toBe(1_000);
  });

  it('keeps the anchor on jitter below the displacement floor', () => {
    const first = accumulateWalkOfferFix(emptyWalkOfferBout(), fix(0, 0, 0));
    // ~1 m east at the equator — well under the stride floor.
    const second = accumulateWalkOfferFix(first, fix(0, 0.00001, 10_000));
    expect(second.movingSeconds).toBe(0);
    expect(second.lastFix?.recordedAt).toBe(0);
  });

  it('counts elapsed time once hops from the anchor cross the floor', () => {
    const first = accumulateWalkOfferFix(emptyWalkOfferBout(), fix(0, 0, 0));
    const jitter = accumulateWalkOfferFix(first, fix(0, 0.00001, 5_000));
    // ~20 m east from the original anchor — above WALK_OFFER_DISPLACEMENT_METERS.
    const second = accumulateWalkOfferFix(jitter, fix(0, 0.0002, 12_000));
    expect(WALK_OFFER_DISPLACEMENT_METERS).toBe(10);
    expect(second.movingSeconds).toBe(12);
  });

  it('adds elapsed seconds when the walker covers ground', () => {
    const first = accumulateWalkOfferFix(emptyWalkOfferBout(), fix(0, 0, 0));
    const second = accumulateWalkOfferFix(first, fix(0, 0.0002, 8_000));
    expect(second.movingSeconds).toBe(8);
  });

  it('ignores a fix that is not newer than the anchor', () => {
    const first = accumulateWalkOfferFix(emptyWalkOfferBout(), fix(0, 0, 8_000));
    const same = accumulateWalkOfferFix(first, fix(0, 0.0002, 8_000));
    expect(same.movingSeconds).toBe(0);
    expect(same.lastFix?.recordedAt).toBe(8_000);
  });
});

describe('preferFurtherWalkOfferBout', () => {
  it('keeps the bout with more moving seconds', () => {
    const short = { movingSeconds: 10, lastFix: fix(0, 0, 1) };
    const long = { movingSeconds: 40, lastFix: fix(0, 0, 2) };
    expect(preferFurtherWalkOfferBout(short, long)).toBe(long);
    expect(preferFurtherWalkOfferBout(long, short)).toBe(long);
  });

  it('prefers the newer fix when seconds match', () => {
    const older = { movingSeconds: 10, lastFix: fix(0, 0, 1) };
    const newer = { movingSeconds: 10, lastFix: fix(0, 0, 9) };
    expect(preferFurtherWalkOfferBout(older, newer)).toBe(newer);
  });
});
