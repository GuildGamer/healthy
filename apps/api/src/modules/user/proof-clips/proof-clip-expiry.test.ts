import { describe, expect, it } from 'vitest';
import { computeProofClipExpiry } from './proof-clip-expiry.js';

describe('computeProofClipExpiry', () => {
  const recordedAt = new Date('2026-01-01T12:00:00.000Z');

  it('uses 30 days after last share/view for solo clips', () => {
    const sharedAt = new Date('2026-01-10T12:00:00.000Z');
    expect(
      computeProofClipExpiry({
        recordedAt,
        matchEndsAt: null,
        sharedAt,
        lastViewedAt: null,
      }).toISOString(),
    ).toBe('2026-02-09T12:00:00.000Z');
  });

  it('uses 30 days after the contest end for group clips', () => {
    const matchEndsAt = new Date('2026-01-07T12:00:00.000Z');
    expect(
      computeProofClipExpiry({
        recordedAt,
        matchEndsAt,
        sharedAt: new Date('2026-01-02T12:00:00.000Z'),
        lastViewedAt: null,
      }).toISOString(),
    ).toBe('2026-02-06T12:00:00.000Z');
  });

  it('never exceeds 90 days after recording', () => {
    const sharedAt = new Date('2026-03-01T12:00:00.000Z');
    expect(
      computeProofClipExpiry({
        recordedAt,
        matchEndsAt: null,
        sharedAt,
        lastViewedAt: null,
      }).toISOString(),
    ).toBe('2026-03-31T12:00:00.000Z');
  });
});
