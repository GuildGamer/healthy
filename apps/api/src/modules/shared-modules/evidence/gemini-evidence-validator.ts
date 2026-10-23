import type { EvidenceVisionConfig } from '../config/environment.js';
import {
  REJECT_UNAVAILABLE,
  createEvidenceChecks,
  evidenceInstruction,
  parseVerdict,
} from './evidence-verdict.js';
import type { EvidenceValidator, GymPhotoInput } from './evidence-validator.js';

type GeminiVisionConfig = Extract<EvidenceVisionConfig, { mode: 'gemini' }>;

type GeminiPart = {
  text?: string;
  thought?: boolean;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
};

type GeminiThinkingConfig = {
  thinkingConfig: { thinkingBudget: 0 };
};

export function createGeminiEvidenceValidator(
  config: GeminiVisionConfig,
): EvidenceValidator {
  return createEvidenceChecks(async (photo, expectation) => {
    try {
      const response = await fetch(geminiGenerateContentUrl(config.model), {
        method: 'POST',
        headers: {
          'x-goog-api-key': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: geminiBody(config.model, photo, expectation),
      });

      if (!response.ok) {
        return { accepted: false, reason: REJECT_UNAVAILABLE };
      }

      const payload = (await response.json()) as GeminiResponse;
      return parseVerdict(geminiAnswer(payload));
    } catch {
      return { accepted: false, reason: REJECT_UNAVAILABLE };
    }
  });
}

function geminiGenerateContentUrl(model: string): string {
  const modelId = encodeURIComponent(model.replace(/^models\//, ''));
  return `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;
}

function geminiBody(model: string, photo: GymPhotoInput, expectation: string): string {
  return JSON.stringify({
    contents: [
      {
        parts: [
          { text: evidenceInstruction(expectation) },
          {
            inline_data: {
              mime_type: photo.mimeType,
              data: photo.imageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      ...(geminiThinkingConfig(model) ?? {}),
    },
  });
}

/**
 * 2.5 Flash thinks by default, which spends tokens and can hide the JSON
 * verdict in a thought part. A budget of 0 turns that off. Other Gemini
 * models keep their own thinking settings.
 */
function geminiThinkingConfig(model: string): GeminiThinkingConfig | null {
  if (model.includes('2.5') && model.includes('flash')) {
    return { thinkingConfig: { thinkingBudget: 0 } };
  }

  return null;
}

function geminiAnswer(payload: GeminiResponse): string | null {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((part) => part.thought !== true && typeof part.text === 'string')
    .map((part) => part.text)
    .join('');

  return text.length > 0 ? text : null;
}
