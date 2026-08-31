import { describe, expect, it } from 'vitest';
import { createEvidenceValidator } from './evidence-validator.js';

const samplePhoto = {
  mimeType: 'image/jpeg' as const,
  imageBase64: 'a'.repeat(32),
};

describe('createEvidenceValidator', () => {
  it('accepts every photo in local accept mode', async () => {
    const validator = createEvidenceValidator({ mode: 'accept' });

    await expect(validator.validateGymPhoto(samplePhoto)).resolves.toEqual({
      accepted: true,
    });
  });
});
