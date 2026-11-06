import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGeminiEvidenceValidator } from './gemini-evidence-validator.js';

const photo = {
  mimeType: 'image/jpeg' as const,
  imageBase64: 'a'.repeat(32),
};

describe('createGeminiEvidenceValidator', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('accepts a photo Gemini approves', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: '{"accepted":true}' }] } }],
        }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const validator = createGeminiEvidenceValidator({
      mode: 'gemini',
      apiKey: 'gemini-test',
      model: 'gemini-2.5-flash',
    });

    await expect(validator.validateGymPhoto(photo)).resolves.toEqual({
      accepted: true,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-goog-api-key': 'gemini-test' }),
      }),
    );
    const request = fetchMock.mock.calls[0]?.[1] as { body: string };
    expect(request.body).toContain('physically inside a gym');
    expect(request.body).toContain(photo.imageBase64);
    expect(request.body).toContain('"thinkingBudget":0');
    expect(request.body).not.toContain('gemini-test');
  });

  it('ignores a thought part and reads the verdict', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    { thought: true, text: 'checking the room' },
                    { text: '{"accepted":false,"reason":"No gym equipment."}' },
                  ],
                },
              },
            ],
          }),
      }),
    );

    const validator = createGeminiEvidenceValidator({
      mode: 'gemini',
      apiKey: 'gemini-test',
      model: 'gemini-2.5-flash',
    });

    await expect(validator.validateGymPhoto(photo)).resolves.toEqual({
      accepted: false,
      reason: 'No gym equipment.',
    });
  });

  it('fails closed when Gemini is unreachable', async () => {
    const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const validator = createGeminiEvidenceValidator({
      mode: 'gemini',
      apiKey: 'gemini-test',
      model: 'gemini-2.5-flash',
    });

    await expect(validator.validateGymPhoto(photo)).resolves.toEqual({
      accepted: false,
      reason: 'We could not check that photo. Try again in a moment.',
    });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"reason":"request_failed"'));
    warnSpy.mockRestore();
  });

  it('fails closed when Gemini returns HTTP error and logs a warning', async () => {
    const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () =>
          JSON.stringify({
            error: { code: 403, message: 'API key not valid.', status: 'PERMISSION_DENIED' },
          }),
      }),
    );

    const validator = createGeminiEvidenceValidator({
      mode: 'gemini',
      apiKey: 'gemini-test',
      model: 'gemini-2.5-flash',
    });

    await expect(validator.validateGymPhoto(photo)).resolves.toEqual({
      accepted: false,
      reason: 'We could not check that photo. Try again in a moment.',
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('"reason":"http_error"'),
    );

    warnSpy.mockRestore();
  });
});
