import type { EvidenceVisionConfig } from '../config/environment.js';
import {
  REJECT_UNAVAILABLE,
  createEvidenceChecks,
  evidenceInstruction,
  parseVerdict,
} from './evidence-verdict.js';
import type { EvidenceValidator, GymPhotoInput } from './evidence-validator.js';

export const OPENAI_CHAT_COMPLETIONS_BASE_URL = 'https://api.openai.com/v1';

type OpenAiVisionConfig = Extract<EvidenceVisionConfig, { mode: 'openai' }>;
type OpenAiCompatibleVisionConfig = Extract<
  EvidenceVisionConfig,
  { mode: 'openai-compatible' }
>;

type ChatCompletionsVisionConfig = {
  apiKey: string;
  model: string;
  baseUrl: string;
  /** OpenAI bills high detail unless this is set. Other hosts reject the field. */
  imageDetail: 'low' | null;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

export function createOpenAiEvidenceValidator(
  config: OpenAiVisionConfig,
): EvidenceValidator {
  return createChatCompletionsEvidenceValidator({
    apiKey: config.apiKey,
    model: config.model,
    baseUrl: OPENAI_CHAT_COMPLETIONS_BASE_URL,
    imageDetail: 'low',
  });
}

export function createOpenAiCompatibleEvidenceValidator(
  config: OpenAiCompatibleVisionConfig,
): EvidenceValidator {
  return createChatCompletionsEvidenceValidator({
    apiKey: config.apiKey,
    model: config.model,
    baseUrl: config.baseUrl,
    imageDetail: null,
  });
}

function createChatCompletionsEvidenceValidator(
  config: ChatCompletionsVisionConfig,
): EvidenceValidator {
  return createEvidenceChecks(async (photo, expectation) => {
    try {
      const response = await fetch(chatCompletionsUrl(config.baseUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: chatCompletionBody(config, photo, expectation),
      });

      if (!response.ok) {
        return { accepted: false, reason: REJECT_UNAVAILABLE };
      }

      const payload = (await response.json()) as ChatCompletionResponse;
      return parseVerdict(payload.choices?.[0]?.message?.content);
    } catch {
      return { accepted: false, reason: REJECT_UNAVAILABLE };
    }
  });
}

function chatCompletionsUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (trimmed.endsWith('/chat/completions')) {
    return trimmed;
  }

  return `${trimmed}/chat/completions`;
}

function chatCompletionBody(
  config: ChatCompletionsVisionConfig,
  photo: GymPhotoInput,
  expectation: string,
): string {
  const imageUrl: { url: string; detail?: 'low' } = {
    url: `data:${photo.mimeType};base64,${photo.imageBase64}`,
  };

  if (config.imageDetail) {
    imageUrl.detail = config.imageDetail;
  }

  return JSON.stringify({
    model: config.model,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: evidenceInstruction(expectation) },
          { type: 'image_url', image_url: imageUrl },
        ],
      },
    ],
  });
}
