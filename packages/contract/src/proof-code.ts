/**
 * Human-readable proof-clip codes. Crockford base32 (no I/L/O/U) plus one
 * Luhn-mod-32 check character so the phone can catch typos before any network
 * call. Displayed as `7KQ4-M2XD`.
 */

export const PROOF_CODE_BODY_LENGTH = 8;
export const PROOF_CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const ALPHABET = PROOF_CODE_ALPHABET;
const ALPHABET_SIZE = ALPHABET.length;

/** Strips separators and folds confusable glyphs into Crockford form. */
export function normaliseProofCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[\s\-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
    .replace(/U/g, 'V');
}

/** `7KQ4M2XD` → `7KQ4-M2XD`. */
export function formatProofCode(code: string): string {
  const normalised = normaliseProofCode(code);
  if (normalised.length !== PROOF_CODE_BODY_LENGTH) {
    return normalised;
  }
  return `${normalised.slice(0, 4)}-${normalised.slice(4)}`;
}

function charValue(char: string): number {
  const index = ALPHABET.indexOf(char);
  if (index < 0) {
    throw new Error(`Invalid proof-code character: ${char}`);
  }
  return index;
}

/** Luhn mod N over Crockford alphabet; last character is the check digit. */
export function proofCodeCheckCharacter(bodyWithoutCheck: string): string {
  let sum = 0;
  let factor = 2;
  for (let index = bodyWithoutCheck.length - 1; index >= 0; index -= 1) {
    let addend = factor * charValue(bodyWithoutCheck[index]!);
    factor = factor === 2 ? 1 : 2;
    addend = Math.floor(addend / ALPHABET_SIZE) + (addend % ALPHABET_SIZE);
    sum += addend;
  }
  const remainder = sum % ALPHABET_SIZE;
  const check = (ALPHABET_SIZE - remainder) % ALPHABET_SIZE;
  return ALPHABET[check]!;
}

export function isValidProofCode(raw: string): boolean {
  const normalised = normaliseProofCode(raw);
  if (normalised.length !== PROOF_CODE_BODY_LENGTH) {
    return false;
  }
  if (![...normalised].every((char) => ALPHABET.includes(char))) {
    return false;
  }
  const body = normalised.slice(0, PROOF_CODE_BODY_LENGTH - 1);
  const check = normalised[PROOF_CODE_BODY_LENGTH - 1]!;
  return proofCodeCheckCharacter(body) === check;
}

/**
 * Builds an 8-character code from 7 random alphabet characters plus a check
 * character. `randomBytes` must return at least 7 bytes.
 */
export function mintProofCode(randomBytes: Uint8Array): string {
  if (randomBytes.length < PROOF_CODE_BODY_LENGTH - 1) {
    throw new Error('Need at least 7 random bytes to mint a proof code');
  }

  let body = '';
  for (let index = 0; index < PROOF_CODE_BODY_LENGTH - 1; index += 1) {
    body += ALPHABET[randomBytes[index]! % ALPHABET_SIZE]!;
  }
  return body + proofCodeCheckCharacter(body);
}
