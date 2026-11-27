export const MINIMUM_PASSWORD_LENGTH = 8;
export const PASSWORD_RULE = `At least ${MINIMUM_PASSWORD_LENGTH} characters`;

/** Enough to enable the button; the server is the judge of a real address. */
export function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
