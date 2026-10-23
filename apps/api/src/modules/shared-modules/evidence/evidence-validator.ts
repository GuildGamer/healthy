import type { EvidenceVisionConfig } from '../config/environment.js';
import { createAcceptEvidenceValidator } from './accept-evidence-validator.js';
import {
  createOpenAiCompatibleEvidenceValidator,
  createOpenAiEvidenceValidator,
} from './chat-completions-evidence-validator.js';
import { createGeminiEvidenceValidator } from './gemini-evidence-validator.js';

export type GymPhotoInput = {
  mimeType: 'image/jpeg' | 'image/png';
  imageBase64: string;
};

export type EvidenceVerdict =
  | { accepted: true }
  | { accepted: false; reason: string };

export type EvidenceValidator = {
  validateGymPhoto(photo: GymPhotoInput): Promise<EvidenceVerdict>;
  validatePhoto(
    photo: GymPhotoInput,
    expectation: string,
  ): Promise<EvidenceVerdict>;
};

export function createEvidenceValidator(
  config: EvidenceVisionConfig,
): EvidenceValidator {
  switch (config.mode) {
    case 'accept':
      return createAcceptEvidenceValidator();
    case 'openai':
      return createOpenAiEvidenceValidator(config);
    case 'gemini':
      return createGeminiEvidenceValidator(config);
    case 'openai-compatible':
      return createOpenAiCompatibleEvidenceValidator(config);
    default: {
      const unexpected: never = config;
      throw new Error(`Unsupported evidence vision provider: ${String(unexpected)}`);
    }
  }
}
