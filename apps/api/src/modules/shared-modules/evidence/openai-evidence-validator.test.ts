import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOpenAiEvidenceValidator } from './openai-evidence-validator.js';

const photo = {
  mimeType: 'image/jpeg' as const,
  imageBase64: 'a'.repeat(32),
};

describe('createOpenAiEvidenceValidator', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('accepts a photo the model approves', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"accepted":true}' } }],
        }),
      }),
    );

    const validator = createOpenAiEvidenceValidator({
      mode: 'openai',
      apiKey: 'sk-test',
      model: 'gpt-4o-mini',
    });

    await expect(validator.validateGymPhoto(photo)).resolves.toEqual({
      accepted: true,
    });
  });

  it('fails closed when the model is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const validator = createOpenAiEvidenceValidator({
      mode: 'openai',
      apiKey: 'sk-test',
      model: 'gpt-4o-mini',
    });

    await expect(validator.validateGymPhoto(photo)).resolves.toEqual({
      accepted: false,
      reason: 'We could not check that photo. Try again in a moment.',
    });
  });
});
