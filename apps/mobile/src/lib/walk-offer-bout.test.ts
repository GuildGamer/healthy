import {
  accumulateWalkOfferFix,
  emptyWalkOfferBout,
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

  it('ignores jitter below the displacement floor', () => {
    const first = accumulateWalkOfferFix(emptyWalkOfferBout(), fix(0, 0, 0));
    // ~1 m east at the equator — well under the stride floor.
    const second = accumulateWalkOfferFix(first, fix(0, 0.00001, 10_000));
    expect(second.movingSeconds).toBe(0);
  });

  it('adds elapsed seconds when the walker covers ground', () => {
    const first = accumulateWalkOfferFix(emptyWalkOfferBout(), fix(0, 0, 0));
    // ~20 m east — above WALK_OFFER_DISPLACEMENT_METERS.
    const second = accumulateWalkOfferFix(first, fix(0, 0.0002, 8_000));
    expect(WALK_OFFER_DISPLACEMENT_METERS).toBe(10);
    expect(second.movingSeconds).toBe(8);
  });
});
