import { describe, expect, it } from 'vitest';
import { evaluateProofAttestation } from './proof-clip-attestation.js';

describe('evaluateProofAttestation', () => {
  it('rejects missing or short assertions', () => {
    expect(evaluateProofAttestation(undefined)).toBe(false);
    expect(evaluateProofAttestation('')).toBe(false);
    expect(evaluateProofAttestation('short')).toBe(false);
  });

  it('accepts a non-empty assertion of sufficient length until App Attest lands', () => {
    expect(evaluateProofAttestation('a'.repeat(32))).toBe(true);
  });
});
