import type { EvidenceVisionConfig } from '../config/environment.js';
import { createAcceptEvidenceValidator } from './accept-evidence-validator.js';
import { createOpenAiEvidenceValidator } from './openai-evidence-validator.js';

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
  if (config.mode === 'accept') {
    return createAcceptEvidenceValidator();
  }

  return createOpenAiEvidenceValidator(config);
}
