import {
  walkOfferShouldPrompt,
  walkOfferThresholdSeconds,
} from '@/lib/walk-offer-threshold';

describe('walkOfferThresholdSeconds', () => {
  it('is a quarter of a ten-minute goal', () => {
    expect(walkOfferThresholdSeconds(10)).toBe(150);
  });

  it('rounds up partial seconds', () => {
    expect(walkOfferThresholdSeconds(1)).toBe(15);
  });

  it('never unlocks a zero goal', () => {
    expect(walkOfferThresholdSeconds(0)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('walkOfferShouldPrompt', () => {
  it('waits until the bout reaches the threshold', () => {
    expect(walkOfferShouldPrompt(149, 10)).toBe(false);
    expect(walkOfferShouldPrompt(150, 10)).toBe(true);
  });
});
