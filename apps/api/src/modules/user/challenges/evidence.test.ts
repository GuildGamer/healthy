import { ORPCError } from '@orpc/server';
import { describe, expect, it } from 'vitest';
import { requireEvidenceFor } from './evidence.js';

const photo = {
  mimeType: 'image/jpeg' as const,
  imageBase64: 'a'.repeat(32),
};

describe('requireEvidenceFor', () => {
  it('ignores photos on a check-in challenge', () => {
    expect(requireEvidenceFor('check_in', photo)).toBeNull();
  });

  it('requires a photo on an evidence challenge', () => {
    expect(() => requireEvidenceFor('evidence_photo', undefined)).toThrow(
      ORPCError,
    );
  });

  it('returns the photo when the challenge needs one', () => {
    expect(requireEvidenceFor('evidence_photo', photo)).toEqual(photo);
  });
});
