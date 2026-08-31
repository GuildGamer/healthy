import type { CountryCode } from '@product/contract/country-code';
import {
  countryCodeFromLocale,
  deviceCountryCode,
  filterCountryOptions,
  countryName,
  countryOptions,
} from './country';

describe('filterCountryOptions', () => {
  const options = countryOptions();

  it('filters by name or code', () => {
    const kenya = filterCountryOptions(options, 'kenya');
    expect(kenya.some((option) => option.code === 'KE')).toBe(true);

    const byCode = filterCountryOptions(options, 'gb');
    expect(byCode.some((option) => option.code === 'GB')).toBe(true);
  });

  it('returns the full list for an empty query', () => {
    expect(filterCountryOptions(options, '  ').length).toBe(options.length);
  });
});

describe('countryName', () => {
  it('resolves a full English label for common codes', () => {
    expect(countryName('US' as CountryCode)).toBe('United States');
    expect(countryName('GB' as CountryCode)).toBe('United Kingdom');
    expect(countryName('CD' as CountryCode)).toBe(
      'Democratic Republic of the Congo',
    );
  });

  it('never falls back to a bare ISO code for known regions', () => {
    for (const option of countryOptions()) {
      expect(option.name.length).toBeGreaterThan(2);
      expect(option.name).not.toBe(option.code);
    }
  });
});

describe('countryCodeFromLocale', () => {
  it('resolves en-US and en-GB to ISO country codes', () => {
    expect(countryCodeFromLocale('en-US')).toBe('US');
    expect(countryCodeFromLocale('en-GB')).toBe('GB');
  });

  it('returns null for unknown or empty locales', () => {
    expect(countryCodeFromLocale('')).toBeNull();
    expect(countryCodeFromLocale('   ')).toBeNull();
    expect(countryCodeFromLocale('en')).toBeNull();
    expect(countryCodeFromLocale('xx-ZZ')).toBeNull();
  });
});

describe('deviceCountryCode', () => {
  it('loads without a native module and returns a code or null', () => {
    expect(() => deviceCountryCode()).not.toThrow();
    const code = deviceCountryCode();
    expect(code === null || typeof code === 'string').toBe(true);
  });
});
