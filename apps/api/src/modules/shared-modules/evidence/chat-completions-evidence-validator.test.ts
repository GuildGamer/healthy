import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOpenAiCompatibleEvidenceValidator } from './chat-completions-evidence-validator.js';

const photo = {
  mimeType: 'image/jpeg' as const,
  imageBase64: 'a'.repeat(32),
};

describe('createOpenAiCompatibleEvidenceValidator', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts to the configured host without OpenAI image detail', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"accepted":true}' } }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const validator = createOpenAiCompatibleEvidenceValidator({
      mode: 'openai-compatible',
      apiKey: 'gsk-test',
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      baseUrl: 'https://api.groq.com/openai/v1/',
    });

    await expect(validator.validateGymPhoto(photo)).resolves.toEqual({
      accepted: true,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer gsk-test' }),
      }),
    );
    const request = fetchMock.mock.calls[0]?.[1] as { body: string };
    expect(request.body).toContain('llama-4-scout');
    expect(request.body).not.toContain('"detail"');
  });
});
