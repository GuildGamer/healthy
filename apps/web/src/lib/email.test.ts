import { describe, expect, it } from 'vitest';
import { isValidEmail } from './email';

describe('isValidEmail', () => {
  it('accepts a normal email', () => {
    expect(isValidEmail('hello@product.example')).toBe(true);
  });

  it('rejects empty and malformed values', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('   ')).toBe(false);
    expect(isValidEmail('not-an-email')).toBe(false);
  });
});
