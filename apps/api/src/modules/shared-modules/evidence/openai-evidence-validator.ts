import type { EvidenceVisionConfig } from '../config/environment.js';
import type {
  EvidenceValidator,
  EvidenceVerdict,
  GymPhotoInput,
} from './evidence-validator.js';

const REJECT_UNAVAILABLE =
  'We could not check that photo. Try again in a moment.';
const REJECT_NOT_GYM =
  'That photo does not look like a gym session. Take another and try again.';

type OpenAiVisionConfig = Extract<EvidenceVisionConfig, { mode: 'openai' }>;

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

const GYM_EXPECTATION = [
  'Decide if this photo shows a person at a gym or clearly exercising.',
  'Reject screenshots, memes, empty rooms, and unrelated selfies.',
].join(' ');

export function createOpenAiEvidenceValidator(
  config: OpenAiVisionConfig,
): EvidenceValidator {
  return {
    validateGymPhoto(photo: GymPhotoInput): Promise<EvidenceVerdict> {
      return this.validatePhoto(photo, GYM_EXPECTATION);
    },
    async validatePhoto(
      photo: GymPhotoInput,
      expectation: string,
    ): Promise<EvidenceVerdict> {
      try {
        const response = await fetch(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${config.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: config.model,
              response_format: { type: 'json_object' },
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: [
                        expectation,
                        'Reply with JSON only: {"accepted":boolean,"reason":string}.',
                        'Reason must be a short sentence the member can read.',
                      ].join(' '),
                    },
                    {
                      type: 'image_url',
                      image_url: {
                        url: `data:${photo.mimeType};base64,${photo.imageBase64}`,
                      },
                    },
                  ],
                },
              ],
            }),
          },
        );

        if (!response.ok) {
          return { accepted: false, reason: REJECT_UNAVAILABLE };
        }

        const payload = (await response.json()) as ChatCompletionResponse;
        const content = payload.choices?.[0]?.message?.content;
        return parseVerdict(content);
      } catch {
        return { accepted: false, reason: REJECT_UNAVAILABLE };
      }
    },
  };
}

function parseVerdict(content: string | null | undefined): EvidenceVerdict {
  if (!content) {
    return { accepted: false, reason: REJECT_UNAVAILABLE };
  }

  try {
    const parsed: unknown = JSON.parse(content);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('accepted' in parsed)
    ) {
      return { accepted: false, reason: REJECT_UNAVAILABLE };
    }

    const accepted = parsed.accepted;
    if (accepted === true) {
      return { accepted: true };
    }

    const reason =
      'reason' in parsed &&
      typeof parsed.reason === 'string' &&
      parsed.reason.trim().length > 0
        ? parsed.reason.trim()
        : REJECT_NOT_GYM;

    return { accepted: false, reason };
  } catch {
    return { accepted: false, reason: REJECT_UNAVAILABLE };
  }
}
