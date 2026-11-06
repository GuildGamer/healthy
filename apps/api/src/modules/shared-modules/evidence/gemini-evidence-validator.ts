import { Logger } from '@nestjs/common';
import type { EvidenceVisionConfig } from '../config/environment.js';
import {
  REJECT_UNAVAILABLE,
  createEvidenceChecks,
  evidenceInstruction,
  parseVerdict,
} from './evidence-verdict.js';
import type { EvidenceValidator, EvidenceVerdict, GymPhotoInput } from './evidence-validator.js';

type GeminiVisionConfig = Extract<EvidenceVisionConfig, { mode: 'gemini' }>;

const logger = new Logger('GeminiEvidenceValidator');

/** Avoid huge log lines; response must never include raw image bytes here. */
const MAX_DEBUG_BODY_CHARS = 2_048;

type GeminiPart = {
  text?: string;
  thought?: boolean;
};

type GeminiCandidate = {
  finishReason?: string;
  content?: {
    parts?: GeminiPart[];
  };
};

type GeminiResponsePayload = {
  error?: {
    code?: unknown;
    message?: unknown;
    status?: unknown;
  };
  candidates?: GeminiCandidate[];
};

type GeminiThinkingConfig = {
  thinkingConfig: { thinkingBudget: 0 };
};

export function createGeminiEvidenceValidator(
  config: GeminiVisionConfig,
): EvidenceValidator {
  return createEvidenceChecks(async (photo, expectation) => {
    const model = config.model.replace(/^models\//, '');
    try {
      const response = await fetch(geminiGenerateContentUrl(config.model), {
        method: 'POST',
        headers: {
          'x-goog-api-key': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: geminiBody(config.model, photo, expectation),
      });

      const rawBody = await response.text();
      const payload = parseGeminiResponseBody(rawBody);

      if (!response.ok) {
        logGeminiEvidenceFailure('http_error', model, response.status, payload, rawBody, null);
        return { accepted: false, reason: REJECT_UNAVAILABLE };
      }

      if (payload === null) {
        logGeminiEvidenceFailure('invalid_json', model, response.status, null, rawBody, null);
        return { accepted: false, reason: REJECT_UNAVAILABLE };
      }

      const answerText = geminiAnswer(payload);
      const verdict = parseVerdict(answerText);
      if (verdictIsUnavailable(verdict)) {
        logGeminiEvidenceFailure(
          'no_verdict',
          model,
          response.status,
          payload,
          rawBody,
          answerText,
        );
      }

      return verdict;
    } catch (error) {
      logger.warn(
        buildGeminiLogObject('request_failed', model, {
          message: error instanceof Error ? error.message : String(error),
        }),
      );
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

function parseGeminiResponseBody(rawBody: string): GeminiResponsePayload | null {
  if (rawBody.trim().length === 0) {
    return null;
  }

  try {
    return JSON.parse(rawBody) as GeminiResponsePayload;
  } catch {
    return null;
  }
}

function geminiAnswer(payload: GeminiResponsePayload): string | null {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((part) => part.thought !== true && typeof part.text === 'string')
    .map((part) => part.text)
    .join('');

  return text.length > 0 ? text : null;
}

function verdictIsUnavailable(verdict: EvidenceVerdict): boolean {
  return !verdict.accepted && verdict.reason === REJECT_UNAVAILABLE;
}

function truncateForLog(value: string): string {
  if (value.length <= MAX_DEBUG_BODY_CHARS) {
    return value;
  }

  return `${value.slice(0, MAX_DEBUG_BODY_CHARS)}…`;
}

type GeminiLogReason =
  | 'http_error'
  | 'invalid_json'
  | 'no_verdict'
  | 'request_failed';

function buildGeminiLogObject(
  reason: GeminiLogReason,
  model: string,
  detail: Record<string, unknown>,
): string {
  return JSON.stringify({
    context: 'gemini_evidence_validator',
    reason,
    model,
    ...detail,
  });
}

function summarizeGeminiPayload(
  payload: GeminiResponsePayload | null,
): Record<string, unknown> {
  if (!payload) {
    return { summary: 'empty_payload' };
  }

  if (payload.error && typeof payload.error === 'object') {
    return {
      summary: 'api_error',
      errorCode: payload.error.code,
      errorStatus: payload.error.status,
      errorMessage:
        typeof payload.error.message === 'string'
          ? truncateForLog(payload.error.message)
          : undefined,
    };
  }

  const candidates = payload.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { summary: 'no_candidates', topLevelKeys: Object.keys(payload) };
  }

  const first = candidates[0];
  if (!first) {
    return { summary: 'empty_candidate', candidateCount: candidates.length };
  }

  const parts = first.content?.parts ?? [];
  const nonThoughtTextParts = parts.filter(
    (part) => part.thought !== true && typeof part.text === 'string',
  );

  return {
    summary: 'candidates',
    candidateCount: candidates.length,
    finishReason: first.finishReason,
    nonThoughtPartCount: nonThoughtTextParts.length,
    firstVerdictPreview:
      nonThoughtTextParts[0]?.text !== undefined
        ? truncateForLog(String(nonThoughtTextParts[0].text))
        : undefined,
  };
}

function logGeminiEvidenceFailure(
  reason: GeminiLogReason,
  model: string,
  httpStatus: number,
  payload: GeminiResponsePayload | null,
  rawBody: string,
  answerText: string | null,
): void {
  logger.warn(
    buildGeminiLogObject(reason, model, {
      httpStatus,
      payloadSummary: summarizeGeminiPayload(payload),
      rawBodyPreview: truncateForLog(rawBody),
      parsedAnswerPreview: answerText ? truncateForLog(answerText) : undefined,
    }),
  );
}
