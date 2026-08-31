import type { EvidenceValidator } from './evidence-validator.js';

export function createAcceptEvidenceValidator(): EvidenceValidator {
  return {
    async validateGymPhoto() {
      return { accepted: true };
    },
    async validatePhoto() {
      return { accepted: true };
    },
  };
}
