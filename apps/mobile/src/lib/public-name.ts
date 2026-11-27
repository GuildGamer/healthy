import { DISPLAY_NAME_MAX_LENGTH, displayNameSchema } from '@product/contract/display-name';

const ALLOWED_CHARACTERS = /^[\p{L}\p{N} ._-]*$/u;

export const PUBLIC_NAME_MAX_LENGTH = DISPLAY_NAME_MAX_LENGTH;
export const PUBLIC_NAME_RULE = `Use 2 to ${PUBLIC_NAME_MAX_LENGTH} letters, numbers, spaces, dots, hyphens or underscores.`;

/** The same rule the API enforces, from the contract rather than a copy. */
export function isValidPublicName(value: string): boolean {
  return displayNameSchema.safeParse(value).success;
}

/** A symbol is wrong as soon as it is typed; shortness only once they stop. */
export function hasDisallowedCharacter(value: string): boolean {
  return !ALLOWED_CHARACTERS.test(value);
}

/**
 * Only the first name from a provider profile, never the surname. Empty when
 * it would not pass the public-name rule.
 */
export function firstNameFrom(fullName: string | null | undefined): string {
  const firstName = fullName?.trim().split(/\s+/)[0] ?? '';
  const trimmed = firstName.slice(0, PUBLIC_NAME_MAX_LENGTH);
  return isValidPublicName(trimmed) ? trimmed : '';
}
