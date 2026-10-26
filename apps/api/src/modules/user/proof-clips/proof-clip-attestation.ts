/**
 * App Attest assertion handling for proof clips (phase 5).
 *
 * Until Apple App Attest is enabled on the app identifier and the assertion
 * is verified against Apple's servers, presence of a non-empty assertion
 * string marks the clip `attested`. Fail closed: an empty or missing
 * assertion never sets the flag.
 */
export function evaluateProofAttestation(attestation: string | undefined): boolean {
  if (!attestation || attestation.trim().length === 0) {
    return false;
  }

  // Phase 5 hardening: verify CBOR assertion, challenge nonce, and key id
  // against App Attest. Until then, accept a non-empty client assertion so
  // clients can wire the field without blocking recording.
  return attestation.trim().length >= 32;
}
