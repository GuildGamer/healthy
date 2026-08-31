import {
  ISO_COUNTRY_CODES,
  normalizeCountryCode,
  type CountryCode,
} from '@product/contract/country-code';
import { COUNTRY_NAMES } from './country-names';

export type CountryOption = {
  code: CountryCode;
  name: string;
};

export function countryName(code: CountryCode): string {
  return COUNTRY_NAMES[code] ?? code;
}

export function countryOptions(): CountryOption[] {
  return ISO_COUNTRY_CODES.map((code) => ({
    code,
    name: countryName(code),
  })).sort((left, right) => left.name.localeCompare(right.name, 'en'));
}

/** Map a BCP-47 locale tag to an ISO country code when possible. */
export function countryCodeFromLocale(locale: string): CountryCode | null {
  const trimmed = locale.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const region = new Intl.Locale(trimmed).region;
    if (region) {
      return normalizeCountryCode(region);
    }
  } catch {
    // Fall through to a simple BCP-47 region parse.
  }

  const parts = trimmed.split(/[-_]/).filter(Boolean);
  for (const part of parts.slice(1)) {
    if (part.length !== 2) {
      continue;
    }

    const code = normalizeCountryCode(part);
    if (code) {
      return code;
    }
  }

  return null;
}

/** Device region from the runtime locale, when it maps to a known ISO code. */
export function deviceCountryCode(): CountryCode | null {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return countryCodeFromLocale(locale ?? '');
  } catch {
    return null;
  }
}

export function filterCountryOptions(
  options: CountryOption[],
  query: string,
): CountryOption[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return options;
  }

  return options.filter(
    (option) =>
      option.name.toLowerCase().includes(normalized) ||
      option.code.toLowerCase().includes(normalized),
  );
}
