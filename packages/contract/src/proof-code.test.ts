import { describe, expect, it } from 'vitest';
import {
  formatProofCode,
  isValidProofCode,
  mintProofCode,
  normaliseProofCode,
  proofCodeCheckCharacter,
} from './proof-code.js';

describe('proof-code', () => {
  it('normalises case, separators, and confusable glyphs', () => {
    expect(normaliseProofCode(' 7kq4-m2xd ')).toBe('7KQ4M2XD');
    expect(normaliseProofCode('OILU')).toBe('011V');
  });

  it('formats as two groups of four', () => {
    expect(formatProofCode('7KQ4M2XD')).toBe('7KQ4-M2XD');
  });

  it('round-trips a minted code through validation', () => {
    const code = mintProofCode(Uint8Array.from([1, 2, 3, 4, 5, 6, 7]));
    expect(code).toHaveLength(8);
    expect(isValidProofCode(code)).toBe(true);
    expect(isValidProofCode(formatProofCode(code))).toBe(true);
  });

  it('rejects a flipped check character', () => {
    const code = mintProofCode(Uint8Array.from([9, 8, 7, 6, 5, 4, 3]));
    const body = code.slice(0, 7);
    const wrongCheck = proofCodeCheckCharacter(body) === '0' ? '1' : '0';
    expect(isValidProofCode(body + wrongCheck)).toBe(false);
  });

  it('rejects wrong lengths and unknown characters', () => {
    expect(isValidProofCode('ABC')).toBe(false);
    expect(isValidProofCode('ABCDEFGH')).toBe(false);
  });
});
