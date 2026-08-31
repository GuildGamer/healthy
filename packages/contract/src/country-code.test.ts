import { describe, expect, it } from 'vitest';
import {
  countryCodeSchema,
  isValidCountryCode,
  normalizeCountryCode,
} from './country-code.js';

describe('country codes', () => {
  it('accepts known ISO alpha-2 codes', () => {
    expect(isValidCountryCode('GB')).toBe(true);
    expect(normalizeCountryCode(' ke ')).toBe('KE');
    expect(countryCodeSchema.parse('us')).toBe('US');
  });

  it('rejects unknown or malformed codes', () => {
    expect(isValidCountryCode('XX')).toBe(false);
    expect(normalizeCountryCode('USA')).toBeNull();
    expect(countryCodeSchema.safeParse('ZZ').success).toBe(false);
  });
});
